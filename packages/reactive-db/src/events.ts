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

export interface ChangeBus {
  emit(table: string, type: ChangeType, meta?: TableChangeMeta): void;
  on(tables: string[], listener: (event: TableChangeEvent) => void): () => void;
}

export function createChangeBus(): ChangeBus {
  const listeners = new Set<{ tables: Set<string>; fn: (event: TableChangeEvent) => void }>();

  return {
    emit(table, type, meta) {
      const event: TableChangeEvent = { table, type, ...meta };
      for (const listener of listeners) {
        if (listener.tables.has("*") || listener.tables.has(table)) {
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
