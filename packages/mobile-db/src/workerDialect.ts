import {
  CompiledQuery,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type DialectAdapter,
  type Driver,
  type Kysely,
  type QueryCompiler,
  type QueryResult,
} from "kysely";
import { statementFacts } from "./statementFacts.js";

/** Everything a worker-backed SQLite engine needs above its own `open` payload. */
export interface WorkerDialectSpec<TOpen> {
  /** Names the engine when a message has to be written about it. */
  label: string;
  worker: Worker;
  open: TOpen;
  /**
   * How long a single statement may take before the channel gives up on it.
   *
   * There was no limit at all, and on Android there needs to be: the OS can freeze or kill a
   * backgrounded app's worker, and every request already in flight - plus every one after it - then
   * waited on a reply that was never coming. A hang has no error message and no stack.
   */
  requestTimeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export interface WorkerExecResult {
  rows: unknown[];
  numAffectedRows: number;
  insertId: number | null;
}

export interface WorkerExecBody {
  type: "exec";
  sql: string;
  parameters: readonly unknown[];
  /**
   * Whether the statement inserts, decided by the dialect from the tree kysely compiled. The worker
   * has only the text, and text is not enough: `insert into t select ...` and a literal containing
   * the word both fool a regex.
   */
  inserts: boolean;
}

export type WorkerOpenBody<TOpen> = { type: "open" } & TOpen;

export type WorkerBody<TOpen> = WorkerOpenBody<TOpen> | WorkerExecBody;

export type WorkerRequest<TOpen> = WorkerBody<TOpen> & { id: number };

export type WorkerResponse =
  | { id: number; ok: true; result: WorkerExecResult | null }
  | { id: number; ok: false; error: string };

/**
 * What a worker half needs from its global scope, declared rather than imported: the
 * `DedicatedWorkerGlobalScope` type lives in the `webworker` lib, which cannot be enabled next to
 * `dom` - and this package needs `dom` for the `Worker` handle on the other side of the channel.
 */
export interface WorkerScope<TOpen> {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: { data: WorkerRequest<TOpen> }) => void) | null;
}

interface Pending {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Several requests may be in flight, matched by id.
 *
 * The worker executes them one at a time regardless - SQLite on one connection is serial - but
 * posting them together removes a main-thread round trip between each, which is most of the cost of
 * a small query. A screen loading with `Promise.all` was paying that hop per query.
 */
class WorkerChannel<TOpen> {
  readonly #worker: Worker;
  readonly #label: string;
  readonly #open: TOpen;
  readonly #timeoutMs: number;
  readonly #pending = new Map<number, Pending>();
  #nextId = 0;
  #opened: Promise<void> | null = null;
  #broken: Error | null = null;

  constructor(spec: WorkerDialectSpec<TOpen>) {
    this.#worker = spec.worker;
    this.#label = spec.label;
    this.#open = spec.open;
    this.#timeoutMs = spec.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

    this.#worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const waiting = this.#pending.get(message.id);
      if (!waiting) return;
      this.#settle(message.id);
      if (message.ok) waiting.resolve(message.result);
      else waiting.reject(new Error(`[mobile-db] ${message.error}`));
    };

    this.#worker.onerror = (event) => {
      this.#break(new Error(`[mobile-db] ${this.#label} failed: ${event.message}`));
    };
  }

  #settle(id: number): void {
    const waiting = this.#pending.get(id);
    if (!waiting) return;
    clearTimeout(waiting.timer);
    this.#pending.delete(id);
  }

  /**
   * A dead worker cannot be revived, so the channel stays broken and every later statement fails
   * with the reason rather than waiting on a reply nobody will send.
   */
  #break(failure: Error): void {
    this.#broken ??= failure;

    const abandoned = [...this.#pending.values()];
    this.#pending.clear();

    for (const waiting of abandoned) {
      clearTimeout(waiting.timer);
      waiting.reject(failure);
    }
  }

  send<R>(request: WorkerBody<TOpen>): Promise<R> {
    if (this.#broken) return Promise.reject(this.#broken);

    const id = this.#nextId++;
    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#settle(id);
        reject(
          new Error(
            `[mobile-db] ${this.#label} did not answer within ${String(this.#timeoutMs)}ms. ` +
              "The worker may have been frozen or killed while the app was in the background.",
          ),
        );
      }, this.#timeoutMs);

      this.#pending.set(id, { resolve: resolve as (result: unknown) => void, reject, timer });
      this.#worker.postMessage({ ...request, id });
    });
  }

  /** Opened once, lazily, and awaited by every statement - including the migrations. */
  open(): Promise<void> {
    this.#opened ??= this.send<null>({ type: "open", ...this.#open }).then(() => undefined);
    return this.#opened;
  }

  terminate(): void {
    this.#break(new Error(`[mobile-db] ${this.#label} was terminated`));
    this.#worker.terminate();
  }
}

/**
 * A fair, non-reentrant async lock: waiters resume in arrival order, so writes keep the order they
 * were issued in rather than the order the event loop happens to resume.
 */
class ConnectionLock {
  #waiting: (() => void)[] = [];
  #held = false;

  async acquire(): Promise<void> {
    if (!this.#held) {
      this.#held = true;
      return;
    }
    await new Promise<void>((resolve) => {
      this.#waiting.push(resolve);
    });
  }

  release(): void {
    const next = this.#waiting.shift();
    if (next) next();
    else this.#held = false;
  }
}

class WorkerConnection<TOpen> implements DatabaseConnection {
  readonly #channel: WorkerChannel<TOpen>;
  readonly #lock: ConnectionLock;
  #holdsLock = false;

  constructor(channel: WorkerChannel<TOpen>, lock: ConnectionLock) {
    this.#channel = channel;
    this.#lock = lock;
  }

  /**
   * Held for a whole transaction rather than per statement, so the statements inside it do not
   * queue behind their own transaction.
   */
  async holdForTransaction(): Promise<void> {
    if (this.#holdsLock) return;
    await this.#lock.acquire();
    this.#holdsLock = true;
  }

  releaseFromTransaction(): void {
    if (!this.#holdsLock) return;
    this.#holdsLock = false;
    this.#lock.release();
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    await this.#channel.open();
    const facts = statementFacts(compiledQuery);

    // Reads never take the lock. The worker is serial, so they cannot corrupt anything - and
    // holding them back is what made a screen loading with `Promise.all` pay a full round trip per
    // query instead of posting them all and letting the worker run them back to back.
    if (!facts.mutates) return this.#run<R>(compiledQuery, facts.inserts);

    // Already inside this connection's own transaction: nothing else can have opened one, because
    // a transaction cannot take the lock while this connection holds it.
    if (this.#holdsLock) return this.#run<R>(compiledQuery, facts.inserts);

    await this.#lock.acquire();
    try {
      return await this.#run<R>(compiledQuery, facts.inserts);
    } finally {
      this.#lock.release();
    }
  }

  async #run<R>(compiledQuery: CompiledQuery, inserts: boolean): Promise<QueryResult<R>> {
    const result = await this.#channel.send<WorkerExecResult>({
      type: "exec",
      sql: compiledQuery.sql,
      parameters: compiledQuery.parameters as unknown[],
      inserts,
    });

    return {
      rows: result.rows as R[],
      numAffectedRows: BigInt(result.numAffectedRows),
      insertId: result.insertId === null ? undefined : BigInt(result.insertId),
    };
  }

  streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("[mobile-db] streaming queries are not supported by a worker driver");
  }
}

class WorkerDriver<TOpen> implements Driver {
  readonly #channel: WorkerChannel<TOpen>;
  readonly #lock = new ConnectionLock();

  constructor(spec: WorkerDialectSpec<TOpen>) {
    this.#channel = new WorkerChannel(spec);
  }

  async init(): Promise<void> {
    await this.#channel.open();
  }

  /**
   * A connection object per acquisition, all sharing the one worker. They are cheap, and giving a
   * transaction its own object is what lets it hold the lock for its whole span while standalone
   * statements take it one at a time.
   */
  async acquireConnection(): Promise<DatabaseConnection> {
    return new WorkerConnection(this.#channel, this.#lock);
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await (connection as WorkerConnection<TOpen>).holdForTransaction();
    try {
      await connection.executeQuery(CompiledQuery.raw("begin"));
    } catch (error) {
      (connection as WorkerConnection<TOpen>).releaseFromTransaction();
      throw error;
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    try {
      await connection.executeQuery(CompiledQuery.raw("commit"));
    } finally {
      (connection as WorkerConnection<TOpen>).releaseFromTransaction();
    }
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    try {
      await connection.executeQuery(CompiledQuery.raw("rollback"));
    } finally {
      (connection as WorkerConnection<TOpen>).releaseFromTransaction();
    }
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    // Defensive: a transaction that neither committed nor rolled back must not strand the lock.
    (connection as WorkerConnection<TOpen>).releaseFromTransaction();
  }

  async destroy(): Promise<void> {
    this.#channel.terminate();
  }
}

/**
 * `SqliteAdapter` reports `supportsMultipleConnections === false`, and kysely answers that by
 * putting every connection acquisition behind a mutex - so statement N+1 was not even posted to the
 * worker until N's reply came back. The channel matches replies by id precisely so several can be
 * in flight, and the worker runs them back to back with no main-thread hop between; the mutex meant
 * that never happened. Reporting `true` does not claim the database supports multiple connections,
 * it claims this dialect handles its own concurrency - which it now does, above.
 */
class WorkerSQLiteAdapter extends SqliteAdapter {
  override get supportsMultipleConnections(): boolean {
    return true;
  }
}

export function createWorkerDialect<TOpen>(spec: WorkerDialectSpec<TOpen>): Dialect {
  return {
    createDriver: (): Driver => new WorkerDriver(spec),
    createQueryCompiler: (): QueryCompiler => new SqliteQueryCompiler(),
    createAdapter: (): DialectAdapter => new WorkerSQLiteAdapter(),
    createIntrospector: (db: Kysely<unknown>): DatabaseIntrospector => new SqliteIntrospector(db),
  };
}
