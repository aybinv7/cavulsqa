import { Capacitor } from "@capacitor/core";
import { Kysely, type Dialect } from "kysely";
import { Migrator } from "kysely/migration";
import { createMobileDatabase, runWrite, type MobileDatabase } from "@cavulsqa/mobile-db";
import { OpfsSQLiteDialect } from "@cavulsqa/mobile-db/opfs";
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
import OpfsWorker from "./opfs.worker?worker";
import { selectedEngine, type DatabaseEngine } from "./engine";
import { migrations } from "./migrations";
import type { Database } from "./schema";

/**
 * One bus for the whole app. Writes announce the tables they touched on it and reactive queries
 * listen to it, so both sides have to be the same instance - which is why it is created here and
 * passed outward rather than constructed wherever it is needed.
 */
export const changeBus = createChangeBus();

let database: MobileDatabase<Database> | null = null;

/**
 * On a device the database is a real SQLite file behind the Capacitor plugin.
 *
 * In a browser it is sql.js in memory, via the dialect `@cavulsqa/mobile-db` already ships for its
 * own tests. That is deliberate: the plugin's web mode needs a `jeep-sqlite` element plus a
 * `sql-wasm.wasm` whose build must match the glue jeep-sqlite bundles - a pairing outside this
 * template's control that breaks on any upstream bump. This path has no assets to serve and no
 * version to keep in step; the cost is that browser data does not survive a reload, which for a
 * template running `vp dev` is the honest trade.
 */
/**
 * Wraps a Kysely instance in the shape the app consumes, and runs the migrations.
 *
 * Shared by the two engines that are plain dialects. The Capacitor engine does not come through
 * here - `createMobileDatabase` builds its own, because it also owns the native connection.
 */
async function fromDialect(
  dialect: Dialect,
  onMissingConnection: string,
): Promise<MobileDatabase<Database>> {
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
      throw new Error(onMissingConnection);
    },
    close: () => db.destroy(),
  };
}

/**
 * sql.js in memory, via the dialect `@cavulsqa/mobile-db` already ships for its own tests.
 *
 * The plugin's own web mode is deliberately unused: it needs a `jeep-sqlite` element plus a
 * `sql-wasm.wasm` whose build must match the glue jeep-sqlite bundles - a pairing outside this
 * template's control that breaks on any upstream bump. The cost is that data does not survive a
 * reload, which for a template running `vp dev` is the honest trade. For durable storage in a
 * WebView, use the `opfs` engine instead.
 */
async function openSqlJsDatabase(): Promise<MobileDatabase<Database>> {
  const { createSqlJsDialect } = await import("@cavulsqa/mobile-db/testing");
  return fromDialect(await createSqlJsDialect(), "sql.js has no native connection");
}

/**
 * SQLite compiled to WebAssembly against a real OPFS file, in a worker.
 *
 * Durable and written page by page like the native engine, but with no bridge in the path - a
 * statement costs a structured clone instead of a JSON round trip through Java. Whether that is
 * actually faster on a given device is what the Reactive screen's benchmark is for.
 */
function openOpfsDatabase(): Promise<MobileDatabase<Database>> {
  return fromDialect(
    new OpfsSQLiteDialect({ worker: new OpfsWorker(), name: "app.sqlite3" }),
    "the OPFS engine has no native connection",
  );
}

function openCapacitorDatabase(): Promise<MobileDatabase<Database>> {
  return createMobileDatabase<Database>({
    name: "app",
    migrations,
    emitTableChange: (table) => changeBus.emit(table, "bulk"),
    /**
     * One native connection cannot serve two writers. This serialises writes and transactions
     * while leaving reads parallel, because the native bridge pipelines concurrent calls and
     * queueing reads costs several times the latency on a screen loading with `Promise.all`.
     */
    serializeAccess: true,
  });
}

let engine: DatabaseEngine | null = null;

/** Which engine the open database is actually running on, for anything that reports or measures. */
export function activeEngine(): DatabaseEngine {
  if (!engine) throw new Error("openDatabase() must be awaited before the engine is known");
  return engine;
}

export async function openDatabase(): Promise<MobileDatabase<Database>> {
  if (database) return database;

  // A browser cannot open the Capacitor engine whatever the stored preference says.
  const wanted = selectedEngine();
  engine = wanted === "capacitor" && !Capacitor.isNativePlatform() ? "sqljs" : wanted;

  database =
    engine === "capacitor"
      ? await openCapacitorDatabase()
      : engine === "opfs"
        ? await openOpfsDatabase()
        : await openSqlJsDatabase();

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
  engine = null;
}
