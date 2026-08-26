import { Kysely, type Dialect } from "kysely";
import { Migrator } from "kysely/migration";
import { runWrite, type MobileDatabase } from "@cavulsqa/mobile-db/core";
import { OpfsSQLiteDialect } from "@cavulsqa/mobile-db/opfs";
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
import { migrations } from "./migrations";
import OpfsWorker from "./opfs.worker?worker";
import { describeOpenFailure, probeOpfs, storageLabel, type StorageTier } from "./storage";
import type { Database } from "./schema";

/**
 * One bus for the whole app. Writes announce the tables they touched on it and reactive queries
 * listen to it, so both sides have to be the same instance - which is why it is created here and
 * passed outward rather than constructed wherever it is needed.
 */
export const changeBus = createChangeBus();

let database: MobileDatabase<Database> | null = null;
let tier: StorageTier | null = null;

/**
 * Wraps a Kysely instance in the shape the app consumes, and runs the migrations.
 *
 * There is no per-platform branching left. The app reaches SQLite one way, and it is the same way in
 * a browser as on a phone - which is the point of the OPFS engine. `pnpm dev` gets a real, durable
 * database instead of an in-memory stand-in that behaved differently from the thing being shipped.
 */
async function fromDialect(dialect: Dialect): Promise<MobileDatabase<Database>> {
  const db = new Kysely<Database>({ dialect });

  await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  }).migrateToLatest();

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

/** Which persistence the open database is using, for anything that reports or measures. */
export function activeStorage(): StorageTier {
  if (!tier) throw new Error("openDatabase() must be awaited before the storage is known");
  return tier;
}

export function activeStorageLabel(): string {
  return storageLabel(activeStorage());
}

export async function openDatabase(): Promise<MobileDatabase<Database>> {
  if (database) return database;

  const probe = probeOpfs();
  if (!probe.supported) throw new Error(probe.reason ?? "OPFS is not available in this WebView");

  try {
    database = await fromDialect(
      new OpfsSQLiteDialect({ worker: new OpfsWorker(), name: "app.sqlite3" }),
    );
  } catch (error) {
    // The engine knows whether it can open; this only makes its answer actionable.
    throw new Error(describeOpenFailure(error));
  }
  tier = "opfs";

  return database;
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
  tier = null;
}
