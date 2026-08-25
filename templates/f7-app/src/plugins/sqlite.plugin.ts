import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { openDatabase } from "@/shared/database";

/**
 * The web build needs its own store initialised before any connection is opened; on a device the
 * plugin owns the file and this is a no-op.
 */
export async function sqlitePlugin(): Promise<void> {
  if (Capacitor.getPlatform() === "web") {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    await sqlite.initWebStore();
  }
  await openDatabase();
}
