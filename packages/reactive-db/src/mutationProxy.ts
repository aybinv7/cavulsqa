import type { Kysely } from "kysely";
import type { ChangeType } from "./events.js";

export interface ReactiveDbDeps<DB> {
  getDb: () => Kysely<DB>;
  emitChange: (table: string, changeType: ChangeType, meta?: { affectedRows?: number }) => void;
}

const MUTATION_CHANGE_TYPE: Record<string, ChangeType> = {
  insertInto: "insert",
  updateTable: "update",
  deleteFrom: "delete",
};

const ROW_COUNT_KEYS = [
  "numUpdatedRows",
  "numDeletedRows",
  "numInsertedOrUpdatedRows",
  "numAffectedRows",
] as const;

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

function wrapExecutor<T>(
  executor: () => Promise<T>,
  table: string,
  changeType: ChangeType,
  onExecuted: (table: string, changeType: ChangeType, result: T) => void,
): () => Promise<T> {
  return async () => {
    const result = await executor();
    onExecuted(table, changeType, result);
    return result;
  };
}

function wrapBuilder(
  builder: any,
  table: string,
  changeType: ChangeType,
  onExecuted: (table: string, changeType: ChangeType, result: unknown) => void,
): any {
  return new Proxy(builder, {
    get(target, prop) {
      const value = target[prop];

      if (typeof value !== "function") {
        return value;
      }

      if (prop === "execute" || prop === "executeTakeFirst" || prop === "executeTakeFirstOrThrow") {
        return wrapExecutor(value.bind(target), table, changeType, onExecuted);
      }

      return (...args: any[]) => {
        const result = value.apply(target, args);

        if (result && typeof result.execute === "function" && result !== target) {
          return wrapBuilder(result, table, changeType, onExecuted);
        }

        return result;
      };
    },
  });
}

function createMutationProxy<DB>(
  db: Kysely<DB>,
  onExecuted: (table: string, changeType: ChangeType, result: unknown) => void,
): Kysely<DB> {
  return new Proxy(db, {
    get(target, prop) {
      const value = (target as any)[prop];

      if (prop === "insertInto" || prop === "updateTable" || prop === "deleteFrom") {
        return (...args: any[]) => {
          const table = args[0] as string;
          const builder = value.apply(target, args);
          const changeType = MUTATION_CHANGE_TYPE[prop as string] as ChangeType;
          return wrapBuilder(builder, table, changeType, onExecuted);
        };
      }

      if (typeof value === "function") {
        return value.bind(target);
      }

      return value;
    },
  }) as Kysely<DB>;
}

function wrapTransactionBuilder<DB>(
  txBuilder: any,
  emitChange: ReactiveDbDeps<DB>["emitChange"],
): any {
  return new Proxy(txBuilder, {
    get(target, prop) {
      const value = target[prop];

      if (prop === "execute" && typeof value === "function") {
        return async (callback: any) => {
          const touchedTables = new Set<string>();
          const result = await value.call(target, (trx: Kysely<DB>) =>
            callback(
              createMutationProxy(trx, (table) => {
                touchedTables.add(table);
              }),
            ),
          );

          for (const table of touchedTables) {
            emitChange(table, "bulk");
          }

          return result;
        };
      }

      if (typeof value === "function") {
        return (...args: any[]) => {
          const result = value.apply(target, args);

          if (result && typeof result.execute === "function") {
            return wrapTransactionBuilder(result, emitChange);
          }

          return result;
        };
      }

      return value;
    },
  });
}

export function createReactiveDb<DB>(deps: ReactiveDbDeps<DB>): Kysely<DB> {
  const { getDb, emitChange } = deps;

  function emitMutationEvent(table: string, changeType: ChangeType, result: unknown): void {
    const affectedRows = affectedRowsOf(result);
    if (affectedRows === 0) return;
    emitChange(table, changeType, affectedRows === null ? undefined : { affectedRows });
  }

  return new Proxy({} as Kysely<DB>, {
    get(_target, prop) {
      const db = getDb();
      const value = (db as any)[prop];

      if (prop === "insertInto" || prop === "updateTable" || prop === "deleteFrom") {
        return (...args: any[]) => {
          const table = args[0] as string;
          const builder = value.apply(db, args);
          const changeType = MUTATION_CHANGE_TYPE[prop as string] as ChangeType;
          return wrapBuilder(builder, table, changeType, emitMutationEvent);
        };
      }

      if (prop === "transaction") {
        return () => {
          const txBuilder = value.apply(db, []);
          return wrapTransactionBuilder(txBuilder, emitChange);
        };
      }

      if (typeof value === "function") {
        return value.bind(db);
      }

      return value;
    },
  }) as Kysely<DB>;
}

export async function executeWithEvent<T>(
  emitChange: ReactiveDbDeps<unknown>["emitChange"],
  table: string,
  changeType: ChangeType,
  executor: () => Promise<T>,
): Promise<T> {
  const result = await executor();
  emitChange(table, changeType);
  return result;
}
