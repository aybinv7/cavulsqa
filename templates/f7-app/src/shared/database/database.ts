import { Capacitor } from "@capacitor/core";
import { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { createMobileDatabase, runWrite, type MobileDatabase } from "@cavulsqa/mobile-db";
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
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
async function openWebDatabase(): Promise<MobileDatabase<Database>> {
  const { createSqlJsDialect } = await import("@cavulsqa/mobile-db/testing");
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });

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
      throw new Error("no native connection in a browser");
    },
    close: () => db.destroy(),
  };
}

export async function openDatabase(): Promise<MobileDatabase<Database>> {
  if (database) return database;

  database =
    Capacitor.getPlatform() === "web"
      ? await openWebDatabase()
      : await createMobileDatabase<Database>({
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
}
