import { createMobileDatabase, type MobileDatabase } from "@cavulsqa/mobile-db";
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
import { migrations } from "./migrations";
import type { Database } from "./schema";

/**
 * One bus for the whole app. Writes announce the tables they touched on it and reactive queries
 * listen to it, so both sides have to be the same instance - that is why it is created here and
 * passed outward rather than constructed wherever it is needed.
 */
export const changeBus = createChangeBus();

let database: MobileDatabase<Database> | null = null;

export async function openDatabase(): Promise<MobileDatabase<Database>> {
  if (database) return database;

  database = await createMobileDatabase<Database>({
    name: "app",
    migrations,
    emitTableChange: (table) => changeBus.emit(table, "bulk"),
    /**
     * One native connection cannot serve two writers. This serialises writes and transactions
     * while leaving reads to run in parallel, because the native bridge pipelines concurrent calls
     * and queueing reads costs several times the latency on a screen that loads with `Promise.all`.
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
