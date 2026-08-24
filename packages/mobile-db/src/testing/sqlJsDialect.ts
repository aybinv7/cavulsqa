import {
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
} from "kysely";
import initSqlJs, { type SqlJsDatabase } from "sql.js/dist/sql-asm.js";

class SqlJsConnection implements DatabaseConnection {
  readonly #db: SqlJsDatabase;

  constructor(db: SqlJsDatabase) {
    this.#db = db;
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const statement = this.#db.prepare(compiledQuery.sql);
    try {
      statement.bind(compiledQuery.parameters);
      const rows: R[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as R);
      }
      return { rows, numAffectedRows: BigInt(this.#db.getRowsModified()) };
    } finally {
      statement.free();
    }
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("streaming is not supported by the sql.js test dialect");
  }
}

function statement(sql: string): CompiledQuery {
  return { sql, parameters: [], query: { kind: "RawNode" } as never, queryId: {} as never };
}

export async function createSqlJsDialect(): Promise<Dialect> {
  const SQL = await initSqlJs();
  const connection = new SqlJsConnection(new SQL.Database());

  const driver: Driver = {
    init: async () => {},
    acquireConnection: async () => connection,
    beginTransaction: async (conn) => {
      await conn.executeQuery(statement("begin"));
    },
    commitTransaction: async (conn) => {
      await conn.executeQuery(statement("commit"));
    },
    rollbackTransaction: async (conn) => {
      await conn.executeQuery(statement("rollback"));
    },
    releaseConnection: async () => {},
    destroy: async () => {},
  };

  return {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => driver,
    createQueryCompiler: () => new SqliteQueryCompiler(),
    createIntrospector: (db) => new SqliteIntrospector(db),
  };
}
