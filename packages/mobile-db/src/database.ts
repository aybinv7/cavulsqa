import { Kysely, Migrator, sql } from "kysely";
import { SharedConnectionSQLiteDialect } from "./kyselyDialect.js";
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import type { MigrationSet } from "./migrations.js";
import { runWrite, type WriteContext, type WriteTelemetry } from "./write.js";

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

export interface MobileDatabaseConfig {
  name: string;
  migrations: MigrationSet;
  sqlite?: SQLiteConnection;
  emitTableChange?: (table: string) => void;
  telemetry?: WriteTelemetry;
  /**
   * Serialize statements and transactions over the shared connection. See
   * `SharedConnectionDialectOptions.serializeAccess`: it fixes a class of concurrent-write
   * corruption, and it requires that no transaction callback reads through the shared
   * database handle.
   */
  serializeAccess?: boolean;
}

export interface MobileDatabase<DB> {
  db: Kysely<DB>;
  write<T>(ctx: WriteContext, work: (trx: Kysely<DB>) => Promise<T>): Promise<T>;
  getRawConnection(): SQLiteDBConnection;
  close(): Promise<void>;
}

export async function createMobileDatabase<DB>(
  config: MobileDatabaseConfig,
): Promise<MobileDatabase<DB>> {
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

  await migrateToLatest(db, config.migrations);

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

/**
 * Reads the migration table and answers whether anything is left to run.
 *
 * `migrateToLatest()` introspects the whole schema before it decides there is nothing to do —
 * on a 119-table database that measured about 550ms of every launch, in two full passes. One
 * read of the names already applied answers the same question. Any failure here (a first run,
 * where the table does not exist yet) falls through to the migrator.
 */
async function everyMigrationApplied<DB>(
  db: Kysely<DB>,
  migrations: MigrationSet,
): Promise<boolean> {
  const wanted = Object.keys(migrations);
  if (wanted.length === 0) return true;

  try {
    const applied = await sql<{ name: string }>`SELECT name FROM kysely_migration`.execute(db);
    const names = new Set(applied.rows.map((row) => row.name));
    return wanted.every((name) => names.has(name));
  } catch {
    return false;
  }
}

async function migrateToLatest<DB>(db: Kysely<DB>, migrations: MigrationSet): Promise<void> {
  if (await everyMigrationApplied(db, migrations)) return;

  const migrator = new Migrator({
    db,
    provider: { getMigrations: async () => migrations },
    migrationTableName: "kysely_migration",
    migrationLockTableName: "kysely_migration_lock",
  });

  const { error } = await migrator.migrateToLatest();
  if (error) {
    throw error instanceof Error ? error : new Error(`Migration failed: ${JSON.stringify(error)}`);
  }
}
