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
import type { WaRequest, WaResponse, WaVfsKind, WithoutId } from "./protocol.js";

export interface WaDialectOptions {
  /**
   * The worker running `runWaWorker()`. The application constructs it, because only the
   * application's bundler can emit a worker and the `.wasm` it loads.
   */
  worker: Worker;
  name: string;
  /** Which virtual file system to mount, which also decides which wasm build is loaded. */
  kind: WaVfsKind;
}

/**
 * One request in flight at a time is not a limitation worth engineering around here: a single
 * SQLite connection is serial anyway, and unlike the Capacitor bridge there is no per-call latency
 * to hide by overlapping. Requests are matched by id so the queue stays honest if that changes.
 */
class WaChannel {
  readonly #worker: Worker;
  readonly #pending = new Map<
    number,
    { resolve: (r: unknown) => void; reject: (e: Error) => void }
  >();
  #nextId = 0;
  #opened: Promise<void> | null = null;

  constructor(private readonly options: WaDialectOptions) {
    this.#worker = options.worker;
    this.#worker.onmessage = (event: MessageEvent<WaResponse>) => {
      const message = event.data;
      const waiting = this.#pending.get(message.id);
      if (!waiting) return;
      this.#pending.delete(message.id);
      if (message.ok) waiting.resolve(message.result);
      else waiting.reject(new Error(`[mobile-db] ${message.error}`));
    };
    this.#worker.onerror = (event) => {
      const failure = new Error(`[mobile-db] the wa-sqlite worker failed: ${event.message}`);
      for (const [id, waiting] of this.#pending) {
        this.#pending.delete(id);
        waiting.reject(failure);
      }
    };
  }

  send<R>(request: WithoutId<WaRequest>): Promise<R> {
    const id = this.#nextId++;
    return new Promise<R>((resolve, reject) => {
      this.#pending.set(id, { resolve: resolve as (r: unknown) => void, reject });
      this.#worker.postMessage({ ...request, id });
    });
  }

  /** Opened once, lazily, and awaited by every statement - including the migrations. */
  open(): Promise<void> {
    this.#opened ??= this.send<null>({
      type: "open",
      name: this.options.name,
      kind: this.options.kind,
    }).then(() => undefined);
    return this.#opened;
  }

  terminate(): void {
    this.#worker.terminate();
  }
}

class WaConnection implements DatabaseConnection {
  constructor(private readonly channel: WaChannel) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    await this.channel.open();

    const result = await this.channel.send<{
      rows: R[];
      numAffectedRows: number;
      insertId: number | null;
    }>({
      type: "exec",
      sql: compiledQuery.sql,
      parameters: compiledQuery.parameters as unknown[],
    });

    return {
      rows: result.rows,
      numAffectedRows: BigInt(result.numAffectedRows),
      insertId: result.insertId === null ? undefined : BigInt(result.insertId),
    };
  }

  streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("[mobile-db] streaming queries are not supported by the wa-sqlite driver");
  }
}

class WaDriver implements Driver {
  readonly #channel: WaChannel;
  readonly #connection: WaConnection;

  constructor(options: WaDialectOptions) {
    this.#channel = new WaChannel(options);
    this.#connection = new WaConnection(this.#channel);
  }

  async init(): Promise<void> {
    await this.#channel.open();
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.#connection;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("begin"));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("commit"));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("rollback"));
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {
    this.#channel.terminate();
  }
}

/**
 * SQLite through wa-sqlite, with the virtual file system chosen per instance.
 *
 * The alternative to the official build: its VFS layer is JavaScript, so it reaches storage that the
 * official engine has no VFS for - IndexedDB in particular, which is the only durable option on a
 * WebView too old for synchronous access handles. The cost is Asyncify, which wraps every call SQLite
 * believes is synchronous, and that is what the benchmark is for.
 */
export class WaSQLiteDialect implements Dialect {
  constructor(private readonly options: WaDialectOptions) {}

  createDriver(): Driver {
    return new WaDriver(this.options);
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
