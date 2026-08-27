import type { ALL_TABLES, TableChangeEvent, TableName } from "./events.js";
import type { QueryKey } from "./queryKey.js";

export interface ReactiveQueryOptions<T = unknown, DB = Record<string, unknown>> {
  /** Every table the query function reads. Under-list one and the screen goes stale in silence. */
  tables: TableName<DB>[];
  /** Identity, taken from the arguments the query reads. See `hashQueryKey`. */
  queryKey: QueryKey;
  debounce?: number;
  debug?: boolean;
  refetchOn?: TableChangeEvent["type"][];
  shouldRefetch?: (event: TableChangeEvent) => boolean;
  cacheTime?: number;
  staleWhileRevalidate?: boolean;
  enabled?: boolean;
  /**
   * Run the query once on mount. Defaults to true. Set false when a caller-owned
   * watcher already drives the initial load, so the mount fetch would only add a
   * redundant run. Unlike `enabled: false`, the table-change subscription stays.
   */
  fetchOnMount?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  cancelOnUnmount?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attempt: number) => number);
  isVisible?: { value: boolean };
}

export interface QueryMetrics {
  recordQuery(queryKey: string, durationMs: number): void;
  recordError(queryKey: string): void;
  recordCacheHit(): void;
  recordRefetch(table: string): void;
  incrementListeners(): void;
  decrementListeners(): void;
}

export type OnTableChangeFn<DB = Record<string, unknown>> = (
  tables: (TableName<DB> | typeof ALL_TABLES)[],
  callback: (event: TableChangeEvent) => void,
) => () => void;

const DEFAULT_RETRY_BASE = 1000;

export function calcRetryDelay(
  attempt: number,
  retryDelay?: number | ((attempt: number) => number),
): number {
  if (typeof retryDelay === "function") return retryDelay(attempt);
  if (typeof retryDelay === "number") return retryDelay;
  return DEFAULT_RETRY_BASE * Math.pow(2, attempt);
}

export const noopMetrics: QueryMetrics = {
  recordQuery() {},
  recordError() {},
  recordCacheHit() {},
  recordRefetch() {},
  incrementListeners() {},
  decrementListeners() {},
};
