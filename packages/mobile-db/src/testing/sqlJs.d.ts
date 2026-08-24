declare module "sql.js/dist/sql-asm.js" {
  interface SqlJsStatement {
    bind(values: readonly unknown[]): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  interface SqlJsDatabase {
    prepare(sql: string): SqlJsStatement;
    run(sql: string, values?: readonly unknown[]): void;
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    getRowsModified(): number;
  }

  const initSqlJs: (options?: {
    locateFile?: (file: string) => string;
  }) => Promise<{ Database: new () => SqlJsDatabase }>;

  export default initSqlJs;
  export type { SqlJsDatabase, SqlJsStatement };
}
