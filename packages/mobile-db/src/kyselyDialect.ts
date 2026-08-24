import {
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type DialectAdapter,
  type Driver,
  type Kysely,
  type QueryCompiler,
  type QueryResult,
} from "kysely";
import { Capacitor } from "@capacitor/core";
import type { SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";

export interface SharedConnectionDialectOptions {
  database: SQLiteDBConnection;
  sqlite: SQLiteConnection;
  name: string;
  /**
   * Serialize writes and transactions over the shared connection.
   *
   * One connection cannot do two things at once, and a write issued outside an explicit
   * transaction asks the driver to open one, so two writes in the same tick race for the
   * BEGIN: on web they both emit it and the second fails, and on native a write arriving
   * during someone else's transaction fails *and* rolls that transaction back, silently
   * discarding committed work. A statement or a whole transaction is therefore the unit
   * of exclusion.
   *
   * Reads are deliberately left out of the lock. The native bridge pipelines concurrent
   * calls — measured on a device, five small reads cost 16-18ms together against 54-69ms
   * awaited one by one — so serializing them costs a real 3-4x on any screen that loads
   * its data with `Promise.all`, and buys only isolation the callers never had. A read
   * running beside an open transaction can still observe its uncommitted rows.
   */
  serializeAccess?: boolean;
}

/**
 * A fair, non-reentrant async lock: waiters are resumed in arrival order, so writes keep
 * the order they were issued in rather than the order the event loop happens to resume.
 */
class ConnectionLock {
  #waiting: (() => void)[] = [];
  #held = false;

  async acquire(): Promise<void> {
    if (!this.#held) {
      this.#held = true;
      return;
    }
    await new Promise<void>((resolve) => this.#waiting.push(resolve));
  }

  release(): void {
    const next = this.#waiting.shift();
    if (next) next();
    else this.#held = false;
  }
}

class SharedSQLiteConnection implements DatabaseConnection {
  readonly #options: SharedConnectionDialectOptions;
  readonly #lock: ConnectionLock | null;
  #holdsLock = false;

  constructor(options: SharedConnectionDialectOptions, lock: ConnectionLock | null) {
    this.#options = options;
    this.#lock = lock;
  }

  /**
   * Called by the driver around an explicit transaction. Kysely gives a transaction its own
   * connection object and runs every statement in the callback through it, so holding the
   * lock here — rather than per statement — makes the transaction indivisible without the
   * statements inside it queueing behind their own transaction.
   */
  async holdForTransaction(): Promise<void> {
    if (!this.#lock || this.#holdsLock) return;
    await this.#lock.acquire();
    this.#holdsLock = true;
  }

  releaseFromTransaction(): void {
    if (!this.#lock || !this.#holdsLock) return;
    this.#holdsLock = false;
    this.#lock.release();
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const sql = compiledQuery.sql.toLowerCase();

    if (sql.includes("select")) return this.#read<R>(compiledQuery);

    // Holding the lock means this connection's own transaction is open, so the statement
    // belongs to it. Nothing else can have opened one, because a transaction cannot take
    // the lock while this connection holds it.
    if (this.#holdsLock) return this.#writeInTransaction<R>(compiledQuery);

    if (this.#lock) {
      await this.#lock.acquire();
      try {
        // Same reasoning inverted: holding the lock excludes every transaction, so the
        // driver does not need to ask the database whether one is open. That question is
        // a bridge round trip of its own, and it was being asked before every write.
        return await this.#write<R>(compiledQuery, sql, false);
      } finally {
        this.#lock.release();
      }
    }
    return this.#write<R>(compiledQuery, sql, true);
  }

  async #write<R>(
    compiledQuery: CompiledQuery,
    sql: string,
    mayBeInTransaction: boolean,
  ): Promise<QueryResult<R>> {
    if (mayBeInTransaction) {
      const { result } = await this.#options.database.isTransactionActive();
      if (result) return this.#writeInTransaction<R>(compiledQuery);
    }

    const { changes } = await this.#options.database.run(
      compiledQuery.sql,
      compiledQuery.parameters as unknown[],
      true,
      sql.includes("returning") ? "all" : "no",
    );

    if (Capacitor.getPlatform() === "web") {
      await this.#options.sqlite.saveToStore(this.#options.name);
    }

    return {
      numAffectedRows: changes?.changes === undefined ? undefined : BigInt(changes.changes),
      insertId: changes?.lastId === undefined ? undefined : BigInt(changes.lastId),
      rows: (changes?.values ?? []) as R[],
    };
  }

  streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("[mobile-db] streaming queries are not supported by the SQLite driver");
  }

  async #read<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { values } = await this.#options.database.query(
      compiledQuery.sql,
      compiledQuery.parameters as unknown[],
    );
    return { rows: (values ?? []) as R[] };
  }

  /**
   * `run()` opens its own transaction, so a write issued while one is already open has to go
   * through `query()` instead. `query()` reports no change count, which leaves
   * `numAffectedRows` undefined — and a compare-and-set write then cannot tell "matched one
   * row" from "matched nothing", so it always reads as nothing. Ask SQLite for the count
   * directly; `changes()` reports the most recent mutation on this connection.
   */
  async #writeInTransaction<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const written = await this.#read<R>(compiledQuery);
    const { values } = await this.#options.database.query("SELECT changes() AS changes", []);
    const changes = (values?.[0] as { changes?: number } | undefined)?.changes;

    return {
      ...written,
      numAffectedRows: changes == null ? undefined : BigInt(changes),
    };
  }
}

class SharedSQLiteDriver implements Driver {
  readonly #options: SharedConnectionDialectOptions;
  readonly #lock = new ConnectionLock();

  constructor(options: SharedConnectionDialectOptions) {
    this.#options = options;
  }

  async init(): Promise<void> {
    if (Capacitor.getPlatform() !== "web") return;
    await this.#options.sqlite.initWebStore();
  }

  /**
   * A connection object per acquisition, all sharing the one underlying SQLite handle.
   * They are cheap, and giving a transaction its own object is what lets it hold the lock
   * for its whole span while standalone statements take the lock one at a time.
   */
  async acquireConnection(): Promise<DatabaseConnection> {
    return new SharedSQLiteConnection(
      this.#options,
      this.#options.serializeAccess ? this.#lock : null,
    );
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await (connection as SharedSQLiteConnection).holdForTransaction();
    try {
      await this.#options.database.beginTransaction();
    } catch (error) {
      (connection as SharedSQLiteConnection).releaseFromTransaction();
      throw error;
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    try {
      await this.#options.database.commitTransaction();
      if (Capacitor.getPlatform() === "web") {
        await this.#options.sqlite.saveToStore(this.#options.name);
      }
    } finally {
      (connection as SharedSQLiteConnection).releaseFromTransaction();
    }
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    try {
      await this.#options.database.rollbackTransaction();
    } finally {
      (connection as SharedSQLiteConnection).releaseFromTransaction();
    }
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    // Defensive: a transaction that neither committed nor rolled back must not strand the lock.
    (connection as SharedSQLiteConnection).releaseFromTransaction();
  }

  async destroy(): Promise<void> {}
}

export class SharedConnectionSQLiteDialect implements Dialect {
  readonly #options: SharedConnectionDialectOptions;

  constructor(options: SharedConnectionDialectOptions) {
    this.#options = options;
  }

  createDriver(): Driver {
    return new SharedSQLiteDriver(this.#options);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
