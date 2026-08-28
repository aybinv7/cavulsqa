import type { Insertable, Kysely, Selectable, Updateable } from "kysely";

export type TableName<DB> = keyof DB & string;

export type Row<DB, T extends TableName<DB>> = Selectable<DB[T]>;
export type NewRow<DB, T extends TableName<DB>> = Insertable<DB[T]>;
export type RowPatch<DB, T extends TableName<DB>> = Updateable<DB[T]>;

export interface ListOpts<DB, T extends TableName<DB>> {
  orderBy?: {
    column: keyof Row<DB, T> & string;
    direction?: "asc" | "desc";
  };
  limit?: number;
  offset?: number;
  /** Soft-deleted rows are hidden by default; a trash screen is the reason this exists. */
  includeDeleted?: boolean;
}

/**
 * Per-table data access over a stable row identity.
 *
 * Deliberately small. It is not a query language - anything shaped by the domain belongs in a
 * domain repository, which is what `query` is for: it hands over the Kysely instance rather than
 * inventing a filter DSL that will always be one clause short.
 */
export interface Repository<DB, T extends TableName<DB>> {
  table: T;
  list(opts?: ListOpts<DB, T>): Promise<Row<DB, T>[]>;
  getById(id: number): Promise<Row<DB, T> | undefined>;
  getByRuid(ruid: string): Promise<Row<DB, T> | undefined>;
  findWhere(where: Partial<Row<DB, T>>): Promise<Row<DB, T>[]>;
  insert(row: NewRow<DB, T>): Promise<Row<DB, T>>;
  update(id: number, patch: RowPatch<DB, T>): Promise<Row<DB, T>>;
  /** Sets the delete date. The row stays, so it can be restored and so a sync can report it. */
  softDelete(id: number): Promise<void>;
  restore(id: number): Promise<Row<DB, T>>;
  query<R>(fn: (db: Kysely<DB>) => Promise<R>): Promise<R>;
}

/**
 * Everything a repository cannot decide for itself.
 *
 * `readDb` and `rdb` are two handles onto the same database on purpose: reads go through the plain
 * one, writes through the reactive proxy so a change announces the table it touched. Passing the
 * proxy for reads would make every read look like a write to anything watching.
 */
export interface RepositoryDeps<DB> {
  readDb: () => Kysely<DB>;
  rdb: Kysely<DB>;
  generateLocalRuid: () => string;
  nowISO: () => string;
}
