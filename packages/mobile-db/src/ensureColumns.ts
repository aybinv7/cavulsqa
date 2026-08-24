import type { Kysely } from "kysely";
import { sql } from "kysely";

export interface ColumnSpec {
  name: string;
  type: string;
  configure?: (col: any) => any;
}

export interface TableColumnsSpec {
  table: string;
  columns: ColumnSpec[];
}

export async function ensureColumns(
  db: Kysely<any>,
  specs: TableColumnsSpec[],
  listColumns: (table: string) => Promise<string[]> = defaultListColumns.bind(null, db),
): Promise<void> {
  for (const { table, columns } of specs) {
    const existing = await listColumns(table);
    for (const col of columns) {
      if (!existing.includes(col.name)) {
        await db.schema
          .alterTable(table)
          .addColumn(col.name, sql.raw(col.type), (cb) => {
            return col.configure ? col.configure(cb) : cb;
          })
          .execute();
      }
    }
  }
}

async function defaultListColumns(db: Kysely<any>, table: string): Promise<string[]> {
  const result = await sql<{
    name: string;
  }>`SELECT name FROM pragma_table_info(${sql.raw(`'${table}'`)})`.execute(db);
  return result.rows.map((row) => row.name);
}
