import type { CreateTableBuilder, Generated, Kysely } from "kysely";

/**
 * The columns a repository reads and writes.
 *
 * Named in one place rather than as string literals down the query builders, because a repository
 * is meaningless without a row shape: it looks rows up by a stable identity, stamps a write time,
 * and hides soft-deleted rows unless asked. Those three facts are the contract.
 *
 * `@cavulsqa/mobile-db`'s `createTableWithDefaults` gives a plain `id` + `created_at` and knows
 * nothing about any of this, which is right - it is a SQLite layer. Use `createLocalFirstTable`
 * below for a table this package can serve.
 */
export const LOCAL_FIRST_COLUMNS = {
  /** Autoincrement, and local to this device. Never sent anywhere as an identity. */
  id: "id",
  /**
   * The stable identity. Generated on the device that creates the row and never reassigned, so it
   * survives a database rebuild, a restored backup, and - for anything that later syncs - a server
   * that hands back an id of its own.
   */
  ruid: "_ruid",
  createDate: "_create_date",
  writeDate: "_write_date",
  /** Null while the row is live. Set, not removed, so a delete is recoverable and observable. */
  deleteDate: "_delete_date",
} as const;

/** The shape every row a repository serves has, whatever else the table holds. */
export interface LocalFirstRow {
  /** Assigned by SQLite, so a row being inserted does not have one yet. */
  id: Generated<number>;
  _ruid: string;
  _create_date: string;
  _write_date: string;
  _delete_date: string | null;
}

/**
 * Creates a table with the columns a repository needs, and nothing else.
 *
 * Anything that also syncs adds its own columns on top - status, attempt counts, retry windows -
 * which is why they are not here. This package has no opinion about a server.
 */
export function createLocalFirstTable(
  // `any` rather than a generic: a migration is handed `Kysely<unknown>`, the schema builder is
  // untyped by nature, and every stricter signature here just moves a cast to the caller.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: Kysely<any>,
  tableName: string,
): CreateTableBuilder<any, any> {
  const columns = LOCAL_FIRST_COLUMNS;
  return db.schema
    .createTable(tableName.replace(/\./g, "_"))
    .addColumn(columns.id, "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn(columns.ruid, "text", (col) => col.notNull().unique())
    .addColumn(columns.createDate, "text", (col) => col.notNull())
    .addColumn(columns.writeDate, "text", (col) => col.notNull())
    .addColumn(columns.deleteDate, "text");
}
