import { Kysely, sql, type Dialect } from "kysely";
import { Migrator } from "kysely/migration";
import { runWrite, type MobileDatabase } from "@cavulsqa/mobile-db/core";
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
import { pragmaProfile, pragmasFor } from "@/app/pragmas.config";
import { storageChain } from "@/app/storage.config";
import type { StorageId } from "./candidates";
import type { StorageAttempt, StorageCandidate } from "./candidates";
import { migrations } from "./migrations";
import { describeOpenFailure } from "./storage";
import type { Database } from "./schema";

/**
 * One bus for the whole app. Writes announce the tables they touched on it and reactive queries
 * listen to it, so both sides have to be the same instance - which is why it is created here and
 * passed outward rather than constructed wherever it is needed.
 */
export const changeBus = createChangeBus();

const RETRY_DELAY_MS = 400;

let database: MobileDatabase<Database> | null = null;
let chosen: StorageCandidate | null = null;
let attempts: StorageAttempt[] = [];
let applied: string[] = [];

/**
 * Wraps a Kysely instance in the shape the app consumes, and runs the migrations.
 *
 * Shared by every candidate: they differ in how bytes reach storage and in nothing above that, which
 * is what makes the chain swappable at all.
 */
async function fromDialect(dialect: Dialect): Promise<MobileDatabase<Database>> {
  const db = new Kysely<Database>({ dialect });

  /**
   * Before the migrations, and identically for every engine. SQLite's defaults are per-build, so two
   * engines left on their own are not comparable - a difference in `synchronous` alone can look like
   * one engine being half as fast as the other.
   */
  applied = [];
  for (const pragma of pragmasFor(pragmaProfile)) {
    try {
      await sql.raw(pragma).execute(db);
      applied.push(pragma);
    } catch (error) {
      // A VFS that refuses a journal mode is worth knowing about, not worth failing over.
      applied.push(`${pragma} -> rejected: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  /**
   * `migrateToLatest` reports failure in its return value rather than throwing, so an unchecked call
   * boots an app whose tables were never created - which is exactly what happened: a deleted
   * migration made kysely refuse the whole set, and the failure only surfaced later as
   * "no such table" from the first query that needed one.
   */
  const migration = await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  }).migrateToLatest();

  if (migration.error) {
    const failed = migration.results?.find((result) => result.status === "Error")?.migrationName;
    // kysely types the error as unknown, and a non-Error would stringify to [object Object].
    const detail =
      migration.error instanceof Error ? migration.error.message : JSON.stringify(migration.error);
    throw new Error(`migration failed${failed ? ` at ${failed}` : ""}: ${detail}`);
  }

  return {
    db,
    write: (ctx, work) =>
      runWrite(ctx, () => db.transaction().execute((trx) => work(trx)), {
        runInTransaction: <R>(task: () => Promise<R>) => task(),
        emitTableChange: (table) => changeBus.emit(table, "bulk"),
      }),
    getRawConnection: () => {
      throw new Error("the OPFS engine has no native connection");
    },
    close: () => db.destroy(),
  };
}

/** Which candidate the open database is using, for anything that reports or measures. */
export function activeStorage(): StorageCandidate {
  if (!chosen) throw new Error("openDatabase() must be awaited before the storage is known");
  return chosen;
}

export function activeStorageLabel(): string {
  return activeStorage().label;
}

/** The PRAGMAs that actually took, so a measurement can state its own configuration. */
export function activePragmas(): readonly string[] {
  return applied;
}

/** Every step of the walk, including the candidates that were skipped and why. */
export function storageAttempts(): readonly StorageAttempt[] {
  return attempts;
}

/**
 * Walks the chain in `storage.config.ts` and keeps the first candidate that opens.
 *
 * A candidate is skipped when it says the device cannot support it, and dropped when it says so by
 * throwing. Every step is recorded: which were skipped and why, which failed and with what, and
 * which won - because a silent fallback to a slower or non-durable engine is the kind of thing that
 * gets discovered weeks later by someone wondering why the app is slow.
 */
const FORCE_KEY = "app.storage.force";

/**
 * Pins the chain to one candidate, for benchmarking.
 *
 * Set `localStorage.app.storage.force` to a candidate id and only that engine is tried - not moved
 * to the front, the *only* one - because a benchmark that quietly fell through to a different engine
 * would report the wrong engine's numbers. An unknown id is ignored rather than bricking the app.
 */
function forcedChain(): StorageCandidate[] {
  let forced: string | null = null;
  try {
    forced = localStorage.getItem(FORCE_KEY);
  } catch {
    // Storage disabled; the full chain is the right answer anyway.
  }
  if (!forced) return storageChain;

  const pinned = storageChain.find((candidate) => candidate.id === (forced as StorageId));
  return pinned ? [pinned] : storageChain;
}

export async function openDatabase(): Promise<MobileDatabase<Database>> {
  if (database) return database;
  if (!storageChain.length) throw new Error("storageChain is empty: nothing can open the database");

  attempts = [];

  const chain = forcedChain();

  for (const candidate of chain) {
    const probe = candidate.probe();
    if (!probe.supported) {
      attempts.push({ id: candidate.id, outcome: "unsupported", detail: probe.reason });
      continue;
    }

    try {
      database = await openCandidate(candidate);
      chosen = candidate;
      attempts.push({ id: candidate.id, outcome: "opened" });
      return database;
    } catch (error) {
      attempts.push({ id: candidate.id, outcome: "failed", detail: describeOpenFailure(error) });
    }
  }

  // Every candidate's reason, because "the database would not open" on its own helps nobody.
  const summary = attempts
    .map(
      (attempt) =>
        `${attempt.id}: ${attempt.outcome}${attempt.detail ? ` - ${attempt.detail}` : ""}`,
    )
    .join("; ");
  throw new Error(`No storage engine could open the database. ${summary}`);
}

/**
 * One retry per candidate, because the pool VFSes take an exclusive lock on their directory and the
 * usual reason it is held is a process on its way out - a crash, or a relaunch racing the old
 * WebView's teardown. Its handles are released when that process dies, so the same open succeeds a
 * moment later. Exactly one retry: past that, the chain moving on is the better answer.
 */
async function openCandidate(candidate: StorageCandidate): Promise<MobileDatabase<Database>> {
  try {
    return await fromDialect(await candidate.createDialect());
  } catch (first) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      return await fromDialect(await candidate.createDialect());
    } catch {
      // The first error is the honest one; the retry's is a duplicate of it.
      throw first;
    }
  }
}

export function getDatabase(): MobileDatabase<Database> {
  if (!database) throw new Error("openDatabase() must be awaited before the database is used");
  return database;
}

/** Writes go through this so every mutation announces its tables without the caller remembering. */
export const rdb = createReactiveDb<Database>({
  getDb: () => getDatabase().db,
  emitChange: changeBus.emit,
});

export async function closeDatabase(): Promise<void> {
  await database?.close();
  database = null;
  chosen = null;
  attempts = [];
  applied = [];
}
