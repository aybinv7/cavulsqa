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
import type { OpfsRequest, OpfsResponse, WithoutId } from "./protocol.js";

export interface OpfsDialectOptions {
  /**
   * The worker running `runOpfsWorker()`. The application constructs it, because only the
   * application's bundler can emit a worker and the `.wasm` it loads.
   */
  worker: Worker;
  name: string;
  capacity?: number;
}

/**
 * One request in flight at a time is not a limitation worth engineering around here: a single
 * SQLite connection is serial anyway, and unlike the Capacitor bridge there is no per-call latency
 * to hide by overlapping. Requests are matched by id so the queue stays honest if that changes.
 */
class OpfsChannel {
  readonly #worker: Worker;
  readonly #pending = new Map<
    number,
    { resolve: (r: unknown) => void; reject: (e: Error) => void }
  >();
  #nextId = 0;
  #opened: Promise<void> | null = null;

  constructor(private readonly options: OpfsDialectOptions) {
    this.#worker = options.worker;
    this.#worker.onmessage = (event: MessageEvent<OpfsResponse>) => {
      const message = event.data;
      const waiting = this.#pending.get(message.id);
      if (!waiting) return;
      this.#pending.delete(message.id);
      if (message.ok) waiting.resolve(message.result);
      else waiting.reject(new Error(`[mobile-db] ${message.error}`));
    };
    this.#worker.onerror = (event) => {
      const failure = new Error(`[mobile-db] the OPFS worker failed: ${event.message}`);
      for (const [id, waiting] of this.#pending) {
        this.#pending.delete(id);
        waiting.reject(failure);
      }
    };
  }

  send<R>(request: WithoutId<OpfsRequest>): Promise<R> {
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
      capacity: this.options.capacity,
    }).then(() => undefined);
    return this.#opened;
  }

  terminate(): void {
    this.#worker.terminate();
  }
}

class OpfsConnection implements DatabaseConnection {
  constructor(private readonly channel: OpfsChannel) {}

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
    throw new Error("[mobile-db] streaming queries are not supported by the OPFS driver");
  }
}

class OpfsDriver implements Driver {
  readonly #channel: OpfsChannel;
  readonly #connection: OpfsConnection;

  constructor(options: OpfsDialectOptions) {
    this.#channel = new OpfsChannel(options);
    this.#connection = new OpfsConnection(this.#channel);
  }

  async init(): Promise<void> {
    await this.#channel.open();
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.#connection;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(raw("begin"));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(raw("commit"));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(raw("rollback"));
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {
    this.#channel.terminate();
  }
}

function raw(sql: string): CompiledQuery {
  return { sql, parameters: [], query: { kind: "RawNode" } as never, queryId: {} as never };
}

/**
 * SQLite compiled to WebAssembly, storing a real database file in OPFS, running in a worker.
 *
 * Unlike the Capacitor dialect there is no native bridge in the path, so a statement costs a
 * structured clone rather than a JSON round trip through Java. Unlike the sql.js test dialect the
 * data is durable and written page by page, rather than by serialising the whole database.
 */
export class OpfsSQLiteDialect implements Dialect {
  constructor(private readonly options: OpfsDialectOptions) {}

  createDriver(): Driver {
    return new OpfsDriver(this.options);
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
