import type { Kysely } from "kysely";
import type { ChangeType, TableName } from "./events.js";

export type EmitChangeFn<DB> = (
  table: TableName<DB>,
  changeType: ChangeType,
  meta?: { affectedRows?: number },
) => void;

export interface ReactiveDbDeps<DB> {
  getDb: () => Kysely<DB>;
  emitChange: EmitChangeFn<DB>;
}

type Notify<DB> = (table: TableName<DB>, changeType: ChangeType, result: unknown) => void;

type UnknownFunction = (...args: unknown[]) => unknown;

const MUTATION_CHANGE_TYPE = {
  insertInto: "insert",
  updateTable: "update",
  deleteFrom: "delete",
} as const satisfies Record<string, ChangeType>;

type MutationMethod = keyof typeof MUTATION_CHANGE_TYPE;

const EXECUTORS = new Set(["execute", "executeTakeFirst", "executeTakeFirstOrThrow"]);

const ROW_COUNT_KEYS = [
  "numUpdatedRows",
  "numDeletedRows",
  "numInsertedOrUpdatedRows",
  "numAffectedRows",
] as const;

function isMutationMethod(prop: string | symbol): prop is MutationMethod {
  return typeof prop === "string" && prop in MUTATION_CHANGE_TYPE;
}

/** Kysely's builders are structurally huge and reached dynamically, so reads are narrowed by hand. */
function read(target: object, prop: string | symbol): unknown {
  return Reflect.get(target, prop) as unknown;
}

function isFunction(value: unknown): value is UnknownFunction {
  return typeof value === "function";
}

function hasExecute(value: unknown): value is object {
  return typeof value === "object" && value !== null && isFunction(read(value, "execute"));
}

export function affectedRowsOf(result: unknown): number | null {
  const rows = Array.isArray(result) ? result : result == null ? [] : [result];
  let counted: number | null = null;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of ROW_COUNT_KEYS) {
      const value = (row as Record<string, unknown>)[key];
      if (value === undefined || value === null) continue;
      counted = (counted ?? 0) + Number(value);
      break;
    }
  }

  return counted ?? (rows.length > 0 ? rows.length : null);
}

function wrapBuilder<DB>(
  builder: object,
  table: TableName<DB>,
  changeType: ChangeType,
  notify: Notify<DB>,
): object {
  return new Proxy(builder, {
    get(target, prop) {
      const value = read(target, prop);
      if (!isFunction(value)) return value;

      if (typeof prop === "string" && EXECUTORS.has(prop)) {
        return async (...args: unknown[]) => {
          const result = await value.apply(target, args);
          notify(table, changeType, result);
          return result;
        };
      }

      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        // A builder method returns another builder; anything else is a plain value.
        return hasExecute(result) && result !== target
          ? wrapBuilder(result, table, changeType, notify)
          : result;
      };
    },
  });
}

function interceptMutations<DB>(db: Kysely<DB>, notify: Notify<DB>): Kysely<DB> {
  return new Proxy(db, {
    get(target, prop) {
      const value = read(target, prop);

      if (isMutationMethod(prop) && isFunction(value)) {
        return (...args: unknown[]) => {
          const table = args[0] as TableName<DB>;
          const builder = value.apply(target, args) as object;
          return wrapBuilder(builder, table, MUTATION_CHANGE_TYPE[prop], notify);
        };
      }

      return isFunction(value) ? value.bind(target) : value;
    },
  });
}

/**
 * A transaction reports what it actually did, per table.
 *
 * It used to report `"bulk"` for everything, which any query filtering on `refetchOn` then dropped
 * on the floor - and since batched writes are the ones that run in transactions, a screen watching
 * for inserts missed precisely the writes that mattered.
 */
function wrapTransactionBuilder<DB>(txBuilder: object, emitChange: EmitChangeFn<DB>): object {
  return new Proxy(txBuilder, {
    get(target, prop) {
      const value = read(target, prop);
      if (!isFunction(value)) return value;

      if (prop === "execute") {
        return async (callback: (trx: Kysely<DB>) => unknown) => {
          const touched = new Map<TableName<DB>, Set<ChangeType>>();

          const result = await value.call(target, (trx: Kysely<DB>) =>
            callback(
              interceptMutations(trx, (table, changeType) => {
                const seen = touched.get(table) ?? new Set<ChangeType>();
                seen.add(changeType);
                touched.set(table, seen);
              }),
            ),
          );

          for (const [table, changeTypes] of touched) {
            for (const changeType of changeTypes) emitChange(table, changeType);
          }

          return result;
        };
      }

      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        return hasExecute(result) ? wrapTransactionBuilder(result, emitChange) : result;
      };
    },
  });
}

/**
 * A Kysely that announces the tables it wrote to.
 *
 * The database is resolved per access rather than captured, so this can be created at module scope
 * before anything has opened it.
 */
export function createReactiveDb<DB>(deps: ReactiveDbDeps<DB>): Kysely<DB> {
  const { getDb, emitChange } = deps;

  const notify: Notify<DB> = (table, changeType, result) => {
    const affectedRows = affectedRowsOf(result);
    if (affectedRows === 0) return;
    emitChange(table, changeType, affectedRows === null ? undefined : { affectedRows });
  };

  return new Proxy({} as Kysely<DB>, {
    get(_target, prop) {
      const db = getDb();
      const value = read(db, prop);

      if (isMutationMethod(prop) && isFunction(value)) {
        return (...args: unknown[]) => {
          const table = args[0] as TableName<DB>;
          const builder = value.apply(db, args) as object;
          return wrapBuilder(builder, table, MUTATION_CHANGE_TYPE[prop], notify);
        };
      }

      if (prop === "transaction" && isFunction(value)) {
        return () => wrapTransactionBuilder(value.apply(db, []) as object, emitChange);
      }

      return isFunction(value) ? value.bind(db) : value;
    },
  });
}

export async function executeWithEvent<T, DB>(
  emitChange: EmitChangeFn<DB>,
  table: TableName<DB>,
  changeType: ChangeType,
  executor: () => Promise<T>,
): Promise<T> {
  const result = await executor();
  emitChange(table, changeType);
  return result;
}
