export interface QueryMetric {
  count: number;
  totalTime: number;
  avgTime: number;
  lastTime: number;
  lastSeen: number;
}

export interface QueryMetricsState {
  queries: Record<string, QueryMetric>;
  errors: Record<string, number>;
  cacheHits: number;
  refetchesByTable: Record<string, number>;
  activeListeners: number;
  startTime: number;
  isDevToolsOpen: boolean;
}

export interface QueryMetricsRecorder {
  recordQuery(queryKey: string, durationMs: number): void;
  recordError(queryKey: string): void;
  recordCacheHit(): void;
  recordRefetch(table: string): void;
  incrementListeners(): void;
  decrementListeners(): void;
  reset(): void;
  getState(): QueryMetricsState;
  toggleDevTools(isOpen?: boolean): void;
}

const DEFAULT_MAX_ENTRIES = 200;

export interface CreateQueryMetricsOptions {
  maxEntries?: number;
  wrapState?: (state: QueryMetricsState) => QueryMetricsState;
}

export function createQueryMetrics(options: CreateQueryMetricsOptions = {}): QueryMetricsRecorder {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const wrapState = options.wrapState ?? ((s: QueryMetricsState) => s);

  const state: QueryMetricsState = wrapState({
    queries: {},
    errors: {},
    cacheHits: 0,
    refetchesByTable: {},
    activeListeners: 0,
    startTime: Date.now(),
    isDevToolsOpen: false,
  });

  function pruneQueries(): void {
    const entries = Object.entries(state.queries);
    if (entries.length <= maxEntries) return;

    const expired = entries
      .sort(([, a], [, b]) => a.lastSeen - b.lastSeen)
      .slice(0, entries.length - maxEntries);

    for (const [key] of expired) {
      delete state.queries[key];
      delete state.errors[key];
    }
  }

  function pruneRecord(record: Record<string, number>): void {
    const keys = Object.keys(record);
    if (keys.length <= maxEntries) return;

    for (const key of keys.slice(0, keys.length - maxEntries)) {
      delete record[key];
    }
  }

  return {
    recordQuery(queryKey, durationMs) {
      const now = Date.now();
      if (!state.queries[queryKey]) {
        state.queries[queryKey] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          lastTime: 0,
          lastSeen: now,
        };
      }
      const metric = state.queries[queryKey]!;
      metric.count++;
      metric.totalTime += durationMs;
      metric.avgTime = metric.totalTime / metric.count;
      metric.lastTime = durationMs;
      metric.lastSeen = now;
      pruneQueries();
    },

    recordError(queryKey) {
      state.errors[queryKey] = (state.errors[queryKey] ?? 0) + 1;
      pruneRecord(state.errors);
    },

    recordCacheHit() {
      state.cacheHits++;
    },

    recordRefetch(table) {
      state.refetchesByTable[table] = (state.refetchesByTable[table] ?? 0) + 1;
      pruneRecord(state.refetchesByTable);
    },

    incrementListeners() {
      state.activeListeners++;
    },

    decrementListeners() {
      if (state.activeListeners > 0) {
        state.activeListeners--;
      }
    },

    reset() {
      state.queries = {};
      state.errors = {};
      state.cacheHits = 0;
      state.refetchesByTable = {};
      state.startTime = Date.now();
    },

    getState() {
      return state;
    },

    toggleDevTools(isOpen) {
      state.isDevToolsOpen = isOpen ?? !state.isDevToolsOpen;
    },
  };
}
