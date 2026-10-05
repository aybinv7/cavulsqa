import {
  CompiledQuery,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
} from "kysely";
import initSqlJs, { type SqlJsDatabase } from "sql.js/dist/sql-asm.js";
import { statementFacts } from "../statementFacts.js";

class SqlJsConnection implements DatabaseConnection {
  readonly #db: SqlJsDatabase;
  #closed = false;

  constructor(db: SqlJsDatabase) {
    this.#db = db;
  }

  /**
   * sql.js answers a query on a closed database with "out of memory", which sends whoever reads it
   * hunting a heap leak, so a closed connection refuses the query itself.
   */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#db.close();
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    if (this.#closed) {
      throw new Error("the sql.js test database was destroyed; create a new dialect per database");
    }
    const statement = this.#db.prepare(compiledQuery.sql);
    try {
      statement.bind(compiledQuery.parameters);
      const rows: R[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as R);
      }
      return {
        rows,
        numAffectedRows: BigInt(this.#db.getRowsModified()),
        insertId: this.#lastInsertId(statementFacts(compiledQuery).inserts),
      };
    } finally {
      statement.free();
    }
  }

  /**
   * The native dialect reports an inserted id even where RETURNING cannot, so a repository written
   * against `insertId` has to behave the same here or the tests pass on a path the device does not
   * take.
   */
  #lastInsertId(inserting: boolean): bigint | undefined {
    if (!inserting) return undefined;
    const rowid = this.#db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0];
    return typeof rowid === "number" ? BigInt(rowid) : undefined;
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("streaming is not supported by the sql.js test dialect");
  }
}

/**
 * Every database from one test file shares a single fixed-size asm.js heap, so `destroy` closes
 * the database to hand its pages back - without it, a file that seeds per test aborts with OOM.
 */
export async function createSqlJsDialect(): Promise<Dialect> {
  const SQL = await initSqlJs();
  const connection = new SqlJsConnection(new SQL.Database());

  const driver: Driver = {
    init: async () => {},
    acquireConnection: async () => connection,
    beginTransaction: async (conn) => {
      await conn.executeQuery(CompiledQuery.raw("begin"));
    },
    commitTransaction: async (conn) => {
      await conn.executeQuery(CompiledQuery.raw("commit"));
    },
    rollbackTransaction: async (conn) => {
      await conn.executeQuery(CompiledQuery.raw("rollback"));
    },
    releaseConnection: async () => {},
    destroy: async () => connection.close(),
  };

  return {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => driver,
    createQueryCompiler: () => new SqliteQueryCompiler(),
    createIntrospector: (db) => new SqliteIntrospector(db),
  };
}
