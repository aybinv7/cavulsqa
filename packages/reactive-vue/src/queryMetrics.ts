import { computed, reactive, type ComputedRef } from "vue";
import {
  createQueryMetrics,
  type QueryMetric,
  type QueryMetricsRecorder,
} from "@cavulsqa/reactive-db";

export interface VueQueryMetricsOptions {
  maxEntries?: number;
  /**
   * Name of a `window` property to expose `snapshot()` and `reset()` on, for a driven session
   * (a device debugger) to read timings without opening dev tools. Omit outside development.
   */
  exposeOnWindowAs?: string;
}

export interface QueryMetricsView {
  totalQueries: ComputedRef<number>;
  avgQueryTime: ComputedRef<number>;
  cacheHitRate: ComputedRef<number>;
  refetchesByTable: ComputedRef<Record<string, number>>;
  queriesByKey: ComputedRef<Record<string, QueryMetric>>;
  slowestQueries: ComputedRef<Array<QueryMetric & { key: string }>>;
  errors: ComputedRef<Record<string, number>>;
  activeListeners: ComputedRef<number>;
  uptime: ComputedRef<number>;
  isDevToolsOpen: ComputedRef<boolean>;
  reset: () => void;
  toggleDevTools: (isOpen?: boolean) => void;
}

export interface VueQueryMetrics {
  recorder: QueryMetricsRecorder;
  useQueryMetrics: () => QueryMetricsView;
}

const SLOWEST_QUERY_COUNT = 5;

/**
 * Wraps the recorder's state in `reactive()` so a dev-tools panel re-renders as queries run, and
 * derives the aggregate views from it. One recorder per app: pass `recorder` to
 * `createReactiveQuery` so both sides count the same queries.
 */
export function createVueQueryMetrics(options: VueQueryMetricsOptions = {}): VueQueryMetrics {
  const recorder = createQueryMetrics({
    maxEntries: options.maxEntries,
    wrapState: reactive,
  });

  const state = recorder.getState();

  if (options.exposeOnWindowAs && typeof window !== "undefined") {
    // The property name is chosen at runtime, so it cannot be declared. `declare global` would put
    // a name of the caller's choosing into every consumer's global namespace to avoid one cast.
    (window as unknown as Record<string, unknown>)[options.exposeOnWindowAs] = {
      snapshot: () => JSON.parse(JSON.stringify(recorder.getState())) as unknown,
      reset: () => recorder.reset(),
    };
  }

  function useQueryMetrics(): QueryMetricsView {
    const totalQueries = computed(() =>
      Object.values(state.queries).reduce((sum, metric) => sum + metric.count, 0),
    );

    const avgQueryTime = computed(() => {
      const metrics = Object.values(state.queries);
      if (metrics.length === 0) return 0;
      const totalTime = metrics.reduce((sum, metric) => sum + metric.totalTime, 0);
      const totalCount = metrics.reduce((sum, metric) => sum + metric.count, 0);
      return totalCount > 0 ? totalTime / totalCount : 0;
    });

    const cacheHitRate = computed(() => {
      const total = totalQueries.value + state.cacheHits;
      return total > 0 ? (state.cacheHits / total) * 100 : 0;
    });

    return {
      totalQueries,
      avgQueryTime,
      cacheHitRate,
      refetchesByTable: computed(() => ({ ...state.refetchesByTable })),
      queriesByKey: computed(() => ({ ...state.queries })),
      slowestQueries: computed(() =>
        Object.entries(state.queries)
          .map(([key, metric]) => ({ key, ...metric }))
          .sort((a, b) => b.avgTime - a.avgTime)
          .slice(0, SLOWEST_QUERY_COUNT),
      ),
      errors: computed(() => ({ ...state.errors })),
      activeListeners: computed(() => state.activeListeners),
      uptime: computed(() => Date.now() - state.startTime),
      isDevToolsOpen: computed(() => state.isDevToolsOpen),
      reset: () => recorder.reset(),
      toggleDevTools: (isOpen?: boolean) => recorder.toggleDevTools(isOpen),
    };
  }

  return { recorder, useQueryMetrics };
}
