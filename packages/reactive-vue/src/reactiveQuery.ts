import {
  computed,
  isRef,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
import {
  calcRetryDelay,
  createVisibilityGate,
  noopMetrics,
  type OnTableChangeFn,
  type QueryMetrics,
  type ReactiveQueryOptions,
  type TableChangeEvent,
} from "@cavulsqa/reactive-db";
import { usePageVisibility } from "./pageVisibility.js";

const DEFAULT_DEBOUNCE = 100;

/**
 * `enabled` may be a ref, so a screen can defer its first read until it is actually shown.
 * Framework7 mounts every tab at startup; without this, a tab the user has not opened still
 * competes for the one native database thread while the first screen is loading.
 */
export type VueReactiveQueryOptions<T> = Omit<ReactiveQueryOptions<T>, "enabled"> & {
  enabled?: boolean | Ref<boolean> | ComputedRef<boolean>;
};

export interface ReactiveQuery<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  isStale: Ref<boolean>;
  isCacheValid: ComputedRef<boolean>;
  cacheAge: ComputedRef<number>;
  retryCount: Ref<number>;
  refetch: (options?: { force?: boolean }) => Promise<void>;
  invalidate: () => Promise<void>;
  cancel: () => void;
}

export interface CreateReactiveQueryDeps {
  /** Subscribe to table changes. Wire this to the same change bus the writes emit on. */
  onTableChange: OnTableChangeFn;
  /** Defaults to a no-op recorder. Pass `createVueQueryMetrics().recorder` to collect timings. */
  metrics?: QueryMetrics;
  /**
   * Resolves the visibility of the surrounding page when a call site does not pass `isVisible`.
   * Defaults to the Framework7 page-visibility composable.
   */
  useVisibility?: () => { value: boolean };
}

export interface ReactiveQueryComposables {
  useReactiveQuery: <T>(
    queryFn: () => Promise<T>,
    options: VueReactiveQueryOptions<T>,
  ) => ReactiveQuery<T>;
  useStructuralQuery: <T>(
    queryFn: () => Promise<T>,
    tables: string[],
    options: Omit<VueReactiveQueryOptions<T>, "tables" | "refetchOn">,
  ) => ReactiveQuery<T>;
  useStaticQuery: <T>(
    queryFn: () => Promise<T>,
    tables: string[],
    options: Omit<VueReactiveQueryOptions<T>, "tables" | "enabled">,
  ) => ReactiveQuery<T>;
}

/**
 * Binds the reactive-db primitives to Vue's lifecycle once, and returns the composables an app
 * calls everywhere. The change bus and the metrics recorder are app-owned singletons, so they are
 * injected here rather than created per query.
 */
export function createReactiveQuery(deps: CreateReactiveQueryDeps): ReactiveQueryComposables {
  const metrics = deps.metrics ?? noopMetrics;
  const resolveVisibility = deps.useVisibility ?? usePageVisibility;

  // Shared across every call site: two screens asking for the same key at the same moment should
  // await one query, not two.
  const inFlightQueries = new Map<string, Promise<unknown>>();

  function useReactiveQuery<T>(
    queryFn: () => Promise<T>,
    options: VueReactiveQueryOptions<T>,
  ): ReactiveQuery<T> {
    const data = ref<T | null>(null) as Ref<T | null>;
    const loading = ref(false);
    const error = ref<Error | null>(null);
    const isStale = ref(false);
    const lastFetchTime = ref<number>(0);
    const cacheClock = ref(Date.now());
    const retryCount = ref(0);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let activeRequestId = 0;
    const debounceMs = options.debounce ?? DEFAULT_DEBOUNCE;
    const enabledRef = isRef(options.enabled) ? options.enabled : ref(options.enabled !== false);
    const fetchOnMount = options.fetchOnMount !== false;
    const queryKey = options.queryKey;
    const cancelOnUnmount = options.cancelOnUnmount !== false;
    const maxRetries = options.retry === false ? 0 : (options.retry ?? 0);

    const cacheAge = computed(() => cacheClock.value - lastFetchTime.value);

    const isCacheValid = computed(() => {
      if (!options.cacheTime || !lastFetchTime.value) return false;
      return cacheClock.value - lastFetchTime.value < options.cacheTime;
    });

    function cancel() {
      activeRequestId++;
    }

    function syncCacheClock() {
      cacheClock.value = Date.now();
    }

    function isCacheValidNow() {
      syncCacheClock();
      return isCacheValid.value;
    }

    async function executeQueryWithRetry(
      showLoading = true,
      attempt = 0,
      force = false,
    ): Promise<void> {
      if (!force && inFlightQueries.has(queryKey)) {
        if (options.debug) {
          console.log(`[useReactiveQuery] Deduping query: ${queryKey}`);
        }
        try {
          data.value = (await inFlightQueries.get(queryKey)) as T;
          metrics.recordCacheHit();
        } catch {
          // The owner of the shared promise reports the failure; a deduped caller stays quiet.
        }
        return;
      }

      cancel();
      const requestId = activeRequestId;

      if (options.staleWhileRevalidate && data.value !== null) {
        isStale.value = true;
      } else {
        loading.value = showLoading;
      }

      error.value = null;
      retryCount.value = attempt;
      const startTime = performance.now();

      const queryPromise = queryFn();
      inFlightQueries.set(queryKey, queryPromise);

      try {
        const result = await queryPromise;

        if (requestId !== activeRequestId) return;

        data.value = result;
        lastFetchTime.value = Date.now();
        isStale.value = false;
        retryCount.value = 0;

        const duration = performance.now() - startTime;
        metrics.recordQuery(queryKey, duration);

        if (options.debug) {
          console.log(`[useReactiveQuery] Query executed (${duration.toFixed(1)}ms):`, result);
        }

        options.onSuccess?.(result);
      } catch (err) {
        if (requestId !== activeRequestId) return;

        const errorObj = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          const delay = calcRetryDelay(attempt, options.retryDelay);
          inFlightQueries.delete(queryKey);
          if (options.debug) {
            console.log(`[useReactiveQuery] Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          return executeQueryWithRetry(showLoading, attempt + 1, force);
        }

        error.value = errorObj;
        isStale.value = false;

        console.error("[useReactiveQuery] Query failed:", err);
        metrics.recordError(queryKey);
        options.onError?.(errorObj);
      } finally {
        loading.value = false;
        if (inFlightQueries.get(queryKey) === queryPromise) {
          inFlightQueries.delete(queryKey);
        }
      }
    }

    function scheduledRefetch() {
      if (isCacheValidNow()) {
        if (options.debug) {
          console.log("[useReactiveQuery] Cache valid, skipping refetch");
        }
        metrics.recordCacheHit();
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        metrics.recordRefetch(options.tables[0] ?? "unknown");
        void executeQueryWithRetry();
        debounceTimer = null;
      }, debounceMs);
    }

    async function refetch(refetchOptions?: { force?: boolean }) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await executeQueryWithRetry(true, 0, refetchOptions?.force);
    }

    function invalidate() {
      lastFetchTime.value = 0;
      syncCacheClock();
      return refetch();
    }

    function shouldTriggerRefetch(event: TableChangeEvent): boolean {
      if (options.refetchOn && !options.refetchOn.includes(event.type)) {
        if (options.debug) {
          console.log(`[useReactiveQuery] Skipping ${event.type} (not in refetchOn)`);
        }
        return false;
      }

      if (options.shouldRefetch && !options.shouldRefetch(event)) {
        if (options.debug) {
          console.log("[useReactiveQuery] Skipping (shouldRefetch returned false)");
        }
        return false;
      }

      return true;
    }

    const gate = createVisibilityGate();
    const visibility = options.isVisible ?? resolveVisibility();
    let unsubscribe: (() => void) | null = null;
    let stopVisibilityWatch: (() => void) | null = null;
    let active = false;

    function activate() {
      if (active) return;
      active = true;

      if (fetchOnMount) void executeQueryWithRetry();

      unsubscribe = deps.onTableChange(options.tables, (event) => {
        if (options.debug) {
          console.log("[useReactiveQuery] Table changed:", event);
        }

        if (!shouldTriggerRefetch(event)) return;

        if (gate.recordChange(visibility.value) === "refetch") {
          scheduledRefetch();
        }
      });

      if (isRef(visibility)) {
        stopVisibilityWatch = watch(visibility, (visible) => {
          if (visible && gate.recordVisible() === "refetch") {
            scheduledRefetch();
          }
        });
      }

      metrics.incrementListeners();
    }

    function deactivate() {
      if (!active) return;
      active = false;
      unsubscribe?.();
      unsubscribe = null;
      stopVisibilityWatch?.();
      stopVisibilityWatch = null;
      metrics.decrementListeners();
    }

    let stopEnabledWatch: (() => void) | null = null;

    onMounted(() => {
      if (enabledRef.value) activate();

      // A deferred screen activates the moment it is enabled - its first read and its table
      // subscription both start then, so nothing is missed by having waited.
      stopEnabledWatch = watch(enabledRef, (isEnabled) => {
        if (isEnabled) activate();
        else deactivate();
      });
    });

    onUnmounted(() => {
      stopEnabledWatch?.();
      deactivate();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (cancelOnUnmount) cancel();
    });

    return {
      data,
      loading,
      error,
      isStale,
      isCacheValid,
      cacheAge,
      retryCount,
      refetch,
      invalidate,
      cancel,
    };
  }

  return {
    useReactiveQuery,

    useStructuralQuery: (queryFn, tables, options) =>
      useReactiveQuery(queryFn, { tables, refetchOn: ["insert", "delete"], ...options }),

    useStaticQuery: (queryFn, tables, options) =>
      useReactiveQuery(queryFn, { tables, enabled: false, ...options }),
  };
}
