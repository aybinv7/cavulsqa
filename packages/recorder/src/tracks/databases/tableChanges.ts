import type { TableChangeCapuData, TableChangeType } from "../../capu/types.js";

/** The whole-bus subscription key. Matches `ALL_TABLES` in `@cavulsqa/reactive-db`'s `events.ts`. */
export const ALL_TABLES = "*";

/** `affectedIds` beyond this count are dropped, matching CV-R01's `TableChangeCapuData` contract. */
export const MAX_AFFECTED_IDS = 50;

/** The event shape emitted by a bus's `on(...)` listener. Structurally matches `TableChangeEvent`. */
export interface TableChangeBusEvent {
  table: string;
  type: TableChangeType;
  affectedRows?: number;
  affectedIds?: Array<string | number>;
  transactionId?: string;
  timestamp?: number;
}

/**
 * Structural stand-in for `ChangeBus` from `@cavulsqa/reactive-db`'s `events.ts`, which this
 * package must not import.
 */
export interface ChangeBusLike {
  on(tables: readonly string[], listener: (event: TableChangeBusEvent) => void): () => void;
}

export interface TableChangeOptions {
  changeBus: ChangeBusLike;
  /** Receives one `TableChangeCapuData` per bus event; `wallMs` carries `event.timestamp` when present. */
  onEvent: (data: TableChangeCapuData, wallMs?: number) => void;
}

export interface TableChangeHandle {
  /** Unsubscribes from the bus. */
  stop(): void;
}

/**
 * Subscribes to every table on `changeBus` and maps each `TableChangeEvent` into a
 * `TableChangeCapuData` marker, capping `affectedIds` at {@link MAX_AFFECTED_IDS} and defaulting
 * `affectedRows`/`transactionId` to `null` when absent.
 */
export function startTableChanges(options: TableChangeOptions): TableChangeHandle {
  const unsubscribe = options.changeBus.on([ALL_TABLES], (event) => {
    const data: TableChangeCapuData = {
      kind: "tableChange",
      engine: "sqlite",
      table: event.table,
      type: event.type,
      affectedRows: event.affectedRows ?? null,
      affectedIds: event.affectedIds ? event.affectedIds.slice(0, MAX_AFFECTED_IDS) : null,
      transactionId: event.transactionId ?? null,
    };
    options.onEvent(data, event.timestamp);
  });

  return {
    stop(): void {
      unsubscribe();
    },
  };
}
