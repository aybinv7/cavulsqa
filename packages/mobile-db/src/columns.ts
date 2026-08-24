import type { CreateTableBuilder, Kysely } from "kysely";

export function defineTableColumns<T>(
  columns: readonly (keyof T & string)[],
): readonly (keyof T & string)[] {
  return columns;
}

export function formatTableName(name: string): string {
  return name.replace(/\./g, "_");
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function createTableWithDefaults(
  db: Kysely<any>,
  tableName: string,
): CreateTableBuilder<any, any> {
  return db.schema
    .createTable(formatTableName(tableName))
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("created_at", "text", (col) => col.notNull());
}
