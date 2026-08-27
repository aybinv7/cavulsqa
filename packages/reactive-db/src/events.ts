/**
 * A table in the schema, when one is known.
 *
 * Defaults to `string` so a caller can skip the parameter, but passing the schema is the point: a
 * table name is the one argument in this library that fails silently. Misspell it in `tables` and
 * the query simply never refetches - no error, no warning, a screen that is stale forever.
 */
export type TableName<DB = Record<string, unknown>> = keyof DB & string;

/** Every table, for a listener that wants the whole bus rather than named tables. */
export const ALL_TABLES = "*";

export type ChangeType = "insert" | "update" | "delete" | "bulk";

export interface TableChangeMeta {
  affectedRows?: number;
  affectedIds?: (string | number)[];
  transactionId?: string;
  timestamp?: number;
}

export interface TableChangeEvent extends TableChangeMeta {
  table: string;
  type: ChangeType;
}

export interface ChangeBus<DB = Record<string, unknown>> {
  emit: (table: TableName<DB>, type: ChangeType, meta?: TableChangeMeta) => void;
  on: (
    tables: (TableName<DB> | typeof ALL_TABLES)[],
    listener: (event: TableChangeEvent) => void,
  ) => () => void;
}

export function createChangeBus<DB = Record<string, unknown>>(): ChangeBus<DB> {
  const listeners = new Set<{ tables: Set<string>; fn: (event: TableChangeEvent) => void }>();

  return {
    emit(table, type, meta) {
      const event: TableChangeEvent = { table, type, ...meta };
      for (const listener of listeners) {
        if (listener.tables.has(ALL_TABLES) || listener.tables.has(table)) {
          listener.fn(event);
        }
      }
    },
    on(tables, listener) {
      const entry = { tables: new Set(tables), fn: listener };
      listeners.add(entry);
      return () => {
        listeners.delete(entry);
      };
    },
  };
}
