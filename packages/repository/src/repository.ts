import type { Kysely, SelectQueryBuilder } from "kysely";
import { LOCAL_FIRST_COLUMNS } from "./columns.js";
import type {
  ListOpts,
  NewRow,
  Repository,
  RepositoryDeps,
  Row,
  RowPatch,
  TableName,
} from "./types.js";

const COLUMNS = LOCAL_FIRST_COLUMNS;

/**
 * Kysely cannot type a table chosen at runtime, so the builders are reached through one deliberately
 * loose alias rather than an `as any` on every call. The casts are contained here; nothing this
 * module exports is loosely typed.
 */
type AnyBuilder = SelectQueryBuilder<Record<string, never>, never, unknown> & {
  where(column: string, op: string, value: unknown): AnyBuilder;
  orderBy(column: string, direction: string): AnyBuilder;
  limit(count: number): AnyBuilder;
  offset(count: number): AnyBuilder;
  execute(): Promise<unknown[]>;
  executeTakeFirst(): Promise<unknown>;
};

interface WriteResult {
  numUpdatedRows?: bigint;
  numDeletedRows?: bigint;
}

export function createRepository<DB, T extends TableName<DB>>(
  table: T,
  deps: RepositoryDeps<DB>,
): Repository<DB, T> {
  const selectAll = (): AnyBuilder =>
    (deps.readDb().selectFrom(table as never) as unknown as AnyBuilder).selectAll() as AnyBuilder;

  const insertInto = () =>
    deps.rdb.insertInto(table as never) as unknown as {
      values(row: Record<string, unknown>): { executeTakeFirstOrThrow(): Promise<unknown> };
    };

  const updateTable = () =>
    deps.rdb.updateTable(table as never) as unknown as {
      set(values: Record<string, unknown>): {
        where(
          column: string,
          op: string,
          value: unknown,
        ): {
          executeTakeFirst(): Promise<WriteResult>;
        };
      };
    };

  async function getById(id: number): Promise<Row<DB, T> | undefined> {
    return (await selectAll().where(COLUMNS.id, "=", id).executeTakeFirst()) as
      | Row<DB, T>
      | undefined;
  }

  async function getByRuid(ruid: string): Promise<Row<DB, T> | undefined> {
    return (await selectAll().where(COLUMNS.ruid, "=", ruid).executeTakeFirst()) as
      | Row<DB, T>
      | undefined;
  }

  async function list(opts?: ListOpts<DB, T>): Promise<Row<DB, T>[]> {
    let query = selectAll();

    if (!opts?.includeDeleted) query = query.where(COLUMNS.deleteDate, "is", null);
    if (opts?.orderBy) {
      query = query.orderBy(opts.orderBy.column, opts.orderBy.direction ?? "asc");
    }
    if (opts?.limit != null) query = query.limit(opts.limit);
    if (opts?.offset != null) query = query.offset(opts.offset);

    return (await query.execute()) as Row<DB, T>[];
  }

  async function findWhere(where: Partial<Row<DB, T>>): Promise<Row<DB, T>[]> {
    let query = selectAll();
    for (const [column, value] of Object.entries(where)) {
      query = query.where(column, "=", value);
    }
    return (await query.execute()) as Row<DB, T>[];
  }

  /**
   * Reads the row back by `_ruid` rather than trusting an insert id.
   *
   * The identity is generated here, so it is the one value known to be correct before the write and
   * after it. An autoincrement id has to be reported by the driver, and not every engine reports one
   * inside a transaction.
   */
  async function insert(row: NewRow<DB, T>): Promise<Row<DB, T>> {
    const source = row as Record<string, unknown>;
    const now = deps.nowISO();
    const ruid = (source[COLUMNS.ruid] as string | undefined) ?? deps.generateLocalRuid();

    await insertInto()
      .values({
        ...source,
        [COLUMNS.ruid]: ruid,
        [COLUMNS.createDate]: source[COLUMNS.createDate] ?? now,
        [COLUMNS.writeDate]: source[COLUMNS.writeDate] ?? now,
      })
      .executeTakeFirstOrThrow();

    const created = await getByRuid(ruid);
    if (!created) throw new Error(`[${table}] insert succeeded but the row was not found`);
    return created;
  }

  async function update(id: number, patch: RowPatch<DB, T>): Promise<Row<DB, T>> {
    await updateTable()
      .set({ ...(patch as Record<string, unknown>), [COLUMNS.writeDate]: deps.nowISO() })
      .where(COLUMNS.id, "=", id)
      .executeTakeFirst();

    const updated = await getById(id);
    if (!updated) throw new Error(`[${table}] update matched no row with id ${id}`);
    return updated;
  }

  async function softDelete(id: number): Promise<void> {
    const now = deps.nowISO();
    await updateTable()
      .set({ [COLUMNS.deleteDate]: now, [COLUMNS.writeDate]: now })
      .where(COLUMNS.id, "=", id)
      .executeTakeFirst();
  }

  async function restore(id: number): Promise<Row<DB, T>> {
    await updateTable()
      .set({ [COLUMNS.deleteDate]: null, [COLUMNS.writeDate]: deps.nowISO() })
      .where(COLUMNS.id, "=", id)
      .executeTakeFirst();

    const restored = await getById(id);
    if (!restored) throw new Error(`[${table}] restore matched no row with id ${id}`);
    return restored;
  }

  async function query<R>(fn: (db: Kysely<DB>) => Promise<R>): Promise<R> {
    return await fn(deps.readDb());
  }

  return {
    table,
    list,
    getById,
    getByRuid,
    findWhere,
    insert,
    update,
    softDelete,
    restore,
    query,
  };
}
