import { Kysely } from "kysely";
import { SharedConnectionSQLiteDialect } from "./dialect.js";
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import type { MobileDatabase } from "../handle.js";
import { migrateIfNeeded, type MigrationSet } from "../migrations.js";
import { runWrite, type WriteTelemetry } from "../write.js";

/**
 * Applied through `query()` rather than `execute()`, and re-applied on every open.
 *
 * `execute()` wraps its statements in a transaction, and SQLite refuses to change
 * journal mode inside one ("cannot change into wal mode from within a transaction"),
 * so every WAL switch silently failed and the database stayed in `delete` mode.
 * Unwrapping is not enough either: a pragma that reports a value cannot go through
 * `execSQL` on Android ("Queries can be performed using query or rawQuery methods
 * only"), so `query()` is the only call that works for all of them.
 *
 * Re-applying matters because Android's SQLiteDatabase sets its own journal mode when
 * it opens a file: WAL is persistent in the file per SQLite, but not across an open
 * here — measured reverting to `delete` on reopen.
 *
 * synchronous is FULL: "an operating system crash or power failure will not corrupt
 * the database", and a committed transaction is not rolled back afterwards. NORMAL
 * is a plausible alternative on WAL, where it is corruption-safe but may lose the
 * most recent commit.
 */
const PRAGMAS = [
  "PRAGMA journal_mode = WAL;",
  "PRAGMA synchronous = FULL;",
  "PRAGMA busy_timeout = 5000;",
  "PRAGMA cache_size = -2000;",
  "PRAGMA temp_store = MEMORY;",
];

const VERIFIED_PRAGMAS = ["journal_mode", "busy_timeout", "synchronous"];

export interface MobileDatabaseConfig<DB = Record<string, unknown>> {
  name: string;
  migrations: MigrationSet;
  sqlite?: SQLiteConnection;
  emitTableChange?: (table: string) => void;
  telemetry?: WriteTelemetry<DB>;
  /**
   * Serialize statements and transactions over the shared connection. See
   * `SharedConnectionDialectOptions.serializeAccess`: it fixes a class of concurrent-write
   * corruption, and it requires that no transaction callback reads through the shared
   * database handle.
   */
  serializeAccess?: boolean;
}

/**
 * The shared handle plus the live plugin connection.
 *
 * Native access to the file is one of the reasons to choose this engine over the worker, so the
 * connection is handed back - but only here. `MobileDatabase` stays engine-independent, because an
 * app on OPFS has no such connection to give.
 */
export interface CapacitorMobileDatabase<DB> extends MobileDatabase<DB> {
  getRawConnection(): SQLiteDBConnection;
}

export async function createMobileDatabase<DB>(
  config: MobileDatabaseConfig<DB>,
): Promise<CapacitorMobileDatabase<DB>> {
  const sqlite = config.sqlite ?? new SQLiteConnection(CapacitorSQLite);
  const connection = await openConnection(sqlite, config.name);
  const db = new Kysely<DB>({
    dialect: new SharedConnectionSQLiteDialect({
      database: connection,
      sqlite,
      name: config.name,
      serializeAccess: config.serializeAccess ?? false,
    }),
  });

  await migrateIfNeeded(db, config.migrations);

  const emit = config.emitTableChange ?? (() => {});

  return {
    db,
    getRawConnection: () => connection,
    write(ctx, work) {
      return runWrite(ctx, () => db.transaction().execute((trx) => work(trx)), {
        runInTransaction: <R>(w: () => Promise<R>) => w(),
        emitTableChange: emit,
        telemetry: config.telemetry,
      });
    },
    async close() {
      await db.destroy();
      await connection.close();
    },
  };
}

export interface CapacitorDialectOptions {
  /** The database file name, without an extension. */
  name: string;
  sqlite?: SQLiteConnection;
  /**
   * Serialize statements and transactions over the shared connection. On by default: one connection
   * cannot serve two writers, and two writes in the same tick otherwise race for the BEGIN.
   */
  serializeAccess?: boolean;
}

/**
 * A ready dialect on the native plugin, opened the careful way.
 *
 * The counterpart to `createOpfsDialect` and `createWaDialect`, and the reason it exists rather than
 * leaving callers to build `SharedConnectionSQLiteDialect` themselves: opening this plugin is not one
 * call. A WebView reload leaves the native connection alive while the JS registry that tracked it is
 * gone, so a naive `createConnection` throws "already exists" on the second open - which is every
 * hot reload, and every resume after Android has killed the WebView.
 */
export async function createCapacitorDialect(
  options: CapacitorDialectOptions,
): Promise<SharedConnectionSQLiteDialect> {
  const sqlite = options.sqlite ?? new SQLiteConnection(CapacitorSQLite);
  const database = await openConnection(sqlite, options.name);

  return new SharedConnectionSQLiteDialect({
    database,
    sqlite,
    name: options.name,
    serializeAccess: options.serializeAccess ?? true,
  });
}

async function openConnection(sqlite: SQLiteConnection, name: string): Promise<SQLiteDBConnection> {
  await reconcileConnections(sqlite);

  const existing = await sqlite.isConnection(name, false);

  let connection: SQLiteDBConnection;
  if (existing.result) {
    connection = await sqlite.retrieveConnection(name, false);
  } else {
    try {
      connection = await sqlite.createConnection(name, false, "no-encryption", 1, false);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        await sqlite.closeConnection(name, false).catch(() => undefined);
        connection = await sqlite.createConnection(name, false, "no-encryption", 1, false);
      } else {
        throw error;
      }
    }
  }

  const open = await connection.isDBOpen();
  if (!open.result) await connection.open();

  await clearAbandonedTransaction(connection, name);

  for (const pragma of PRAGMAS) {
    try {
      await connection.query(pragma, []);
    } catch (error) {
      console.warn(`[mobile-db] PRAGMA failed: ${pragma}`, error);
    }
  }
  await logEffectivePragmas(connection);

  return connection;
}

/**
 * A native connection outlives the JavaScript realm that opened it, so a WebView reload
 * (an OTA update, a dev refresh) can leave a transaction open with no handle to finish it:
 * the write lock is held, and the next writer either fails with "Already in transaction"
 * or is silently absorbed into a transaction nobody will ever commit. Roll it back before
 * anything else touches the database.
 */
async function clearAbandonedTransaction(
  connection: SQLiteDBConnection,
  name: string,
): Promise<void> {
  try {
    const active = await connection.isTransactionActive();
    if (!active.result) return;
    await connection.rollbackTransaction();
    console.warn(
      `[mobile-db] rolled back a transaction left open on "${name}" by a previous session`,
    );
  } catch (error) {
    console.warn(`[mobile-db] could not clear the transaction state on "${name}"`, error);
  }
}

async function reconcileConnections(sqlite: SQLiteConnection): Promise<void> {
  try {
    await sqlite.checkConnectionsConsistency();
  } catch (error) {
    if (Capacitor.getPlatform() !== "web") {
      console.warn("[mobile-db] connection consistency check skipped", error);
    }
  }
}

async function logEffectivePragmas(connection: SQLiteDBConnection): Promise<void> {
  const effective: Record<string, unknown> = {};

  for (const pragma of VERIFIED_PRAGMAS) {
    try {
      const result = await connection.query(`PRAGMA ${pragma};`);
      // A pragma does not necessarily name its column after itself — busy_timeout
      // reports "timeout" — so read the first value rather than guessing the key.
      const row = result.values?.[0] as Record<string, unknown> | undefined;
      effective[pragma] = row ? Object.values(row)[0] : undefined;
    } catch (error) {
      effective[pragma] =
        `<read failed: ${error instanceof Error ? error.message : String(error)}>`;
    }
  }

  console.log("[mobile-db] effective PRAGMAs:", effective);

  const journalMode = String(effective.journal_mode);
  if (!journalMode.toLowerCase().startsWith("wal")) {
    console.warn(
      `[mobile-db] journal_mode is "${journalMode}", not WAL — writes will block reads on this platform/device.`,
    );
  }
}
