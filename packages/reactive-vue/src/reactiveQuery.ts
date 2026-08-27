import {
  computed,
  isRef,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import {
  calcRetryDelay,
  createVisibilityGate,
  hashQueryKey,
  noopMetrics,
  type OnTableChangeFn,
  type QueryKey,
  type QueryMetrics,
  type ReactiveQueryOptions,
  type TableChangeEvent,
  type TableName,
} from "@cavulsqa/reactive-db";
import { resolveQueryKey } from "./queryKey.js";

const DEFAULT_DEBOUNCE = 100;

const ALWAYS_VISIBLE: ComputedRef<boolean> = computed(() => true);

export interface ReactiveQueryLogger {
  debug: (message: string, ...details: unknown[]) => void;
  warn: (message: string, ...details: unknown[]) => void;
  error: (message: string, ...details: unknown[]) => void;
}

const consoleLogger: ReactiveQueryLogger = {
  debug: (message, ...details) => console.log(message, ...details),
  warn: (message, ...details) => console.warn(message, ...details),
  error: (message, ...details) => console.error(message, ...details),
};

export type VueReactiveQueryOptions<T, DB = Record<string, unknown>> = Omit<
  ReactiveQueryOptions<T, DB>,
  "enabled" | "queryKey" | "isVisible"
> & {
  /**
   * `enabled` may be a ref, so a screen can defer its first read until it is actually shown.
   * Framework7 mounts every tab at startup; without this, a tab the user has not opened still
   * competes for the one database thread while the first screen is loading.
   */
  enabled?: boolean | Ref<boolean> | ComputedRef<boolean>;
  /**
   * Identity, from the values the query reads: `["order", id]`, not `"order"`.
   *
   * Refs inside the key are unwrapped and tracked, so `["search", term]` re-keys the query as the
   * term moves: the key follows the filter and brings the debounced refetch with it, instead of a
   * manual `refetch()` on every keystroke.
   */
  queryKey: MaybeRefOrGetter<QueryKey>;
  /** A real ref, because a plain object cannot be watched and a deferred refetch would never run. */
  isVisible?: Ref<boolean> | ComputedRef<boolean>;
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

export interface CreateReactiveQueryDeps<DB = Record<string, unknown>> {
  /** Subscribe to table changes. Wire this to the same change bus the writes emit on. */
  onTableChange: OnTableChangeFn<DB>;
  /** Defaults to a no-op recorder. Pass `createVueQueryMetrics().recorder` to collect timings. */
  metrics?: QueryMetrics;
  /**
   * Resolves the visibility of the surrounding page when a call site does not pass `isVisible`.
   * Defaults to always-visible, which means a screen the user cannot see still refetches. On a
   * router that mounts every tab up front, pass an adapter - `usePageVisibility` from
   * `@cavulsqa/reactive-vue/framework7` is one.
   */
  useVisibility?: () => Ref<boolean> | ComputedRef<boolean>;
  /**
   * Warn when two mounted queries share a key but watch different tables - they are different
   * queries, so the second is handed the first's rows. On unless turned off.
   */
  warnOnKeyConflict?: boolean;
  /**
   * Where a failed query and the `debug` traces go. Defaults to the console; pass the app's error
   * service so a failure reaches the same place as every other one.
   */
  logger?: ReactiveQueryLogger;
}

export interface ReactiveQueryComposables<DB = Record<string, unknown>> {
  useReactiveQuery: <T>(
    queryFn: () => Promise<T>,
    options: VueReactiveQueryOptions<T, DB>,
  ) => ReactiveQuery<T>;
  useStructuralQuery: <T>(
    queryFn: () => Promise<T>,
    tables: TableName<DB>[],
    options: Omit<VueReactiveQueryOptions<T, DB>, "tables" | "refetchOn">,
  ) => ReactiveQuery<T>;
  useStaticQuery: <T>(
    queryFn: () => Promise<T>,
    tables: TableName<DB>[],
    options: Omit<VueReactiveQueryOptions<T, DB>, "tables" | "enabled">,
  ) => ReactiveQuery<T>;
}

/**
 * Binds the reactive-db primitives to Vue's lifecycle once, and returns the composables an app
 * calls everywhere. The change bus and the metrics recorder are app-owned singletons, so they are
 * injected here rather than created per query.
 *
 * Pass the schema - `createReactiveQuery<Database>({...})` - and every `tables` entry is checked
 * against it. A misspelt table name is the one mistake this library cannot report at run time: the
 * query subscribes to nothing and simply never refetches.
 *
 * `deps` is `NoInfer` because `keyof DB` is not an inference site TypeScript can invert: handed an
 * already-typed `onTableChange`, it solved DB as a union of one object per table, and every
 * `tables` entry in the app then failed against `never`. Now the schema comes from the type
 * argument or not at all.
 */
export function createReactiveQuery<DB = Record<string, unknown>>(
  deps: NoInfer<CreateReactiveQueryDeps<DB>>,
): ReactiveQueryComposables<DB> {
  const metrics = deps.metrics ?? noopMetrics;
  const resolveVisibility = deps.useVisibility ?? (() => ALWAYS_VISIBLE);
  const warnOnKeyConflict = deps.warnOnKeyConflict ?? true;
  const logger = deps.logger ?? consoleLogger;

  // Shared across every call site: two screens asking for the same key at the same moment should
  // await one query, not two.
  const inFlightQueries = new Map<string, Promise<unknown>>();

  // A key is an identity, and a duplicated one silently crosses two queries' results. Tables are
  // the cheapest signal that two call sites are not in fact the same query.
  const watchedTablesByKey = new Map<string, { tables: string; holders: number }>();

  function claimKey(key: string, tables: TableName<DB>[]): void {
    const signature = [...tables].sort().join(",");
    const existing = watchedTablesByKey.get(key);

    if (!existing) {
      watchedTablesByKey.set(key, { tables: signature, holders: 1 });
      return;
    }

    if (warnOnKeyConflict && existing.tables !== signature) {
      logger.warn(
        `[useReactiveQuery] the key ${key} is mounted twice watching different tables ` +
          `("${existing.tables}" and "${signature}"). These are different queries sharing an ` +
          `identity, so one will receive the other's result. Add what distinguishes them to the ` +
          `key.`,
      );
    }

    existing.holders += 1;
  }

  function releaseKey(key: string): void {
    const existing = watchedTablesByKey.get(key);
    if (!existing) return;
    existing.holders -= 1;
    if (existing.holders <= 0) watchedTablesByKey.delete(key);
  }

  function useReactiveQuery<T>(
    queryFn: () => Promise<T>,
    options: VueReactiveQueryOptions<T, DB>,
  ): ReactiveQuery<T> {
    const data = ref<T | null>(null) as Ref<T | null>;
    const loading = ref(false);
    const error = ref<Error | null>(null);
    const isStale = ref(false);
    const lastFetchTime = ref<number>(0);
    const cacheClock = ref(Date.now());
    const retryCount = ref(0);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let abandonRetry: (() => void) | null = null;
    let disposed = false;
    let activeRequestId = 0;
    const debounceMs = options.debounce ?? DEFAULT_DEBOUNCE;
    const enabledRef = isRef(options.enabled) ? options.enabled : ref(options.enabled !== false);
    const fetchOnMount = options.fetchOnMount !== false;
    const keyHash = computed(() => hashQueryKey(resolveQueryKey(options.queryKey)));
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

    /**
     * Resolves when the backoff elapses, or immediately when the query is torn down. Waiting on a
     * bare `setTimeout` meant an unmount mid-backoff still woke up and ran `queryFn` again -
     * against the one native database thread this composable exists to protect.
     */
    function waitForRetry(delay: number): Promise<void> {
      return new Promise<void>((resolve) => {
        abandonRetry = () => {
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = null;
          abandonRetry = null;
          resolve();
        };
        retryTimer = setTimeout(() => {
          retryTimer = null;
          abandonRetry = null;
          resolve();
        }, delay);
      });
    }

    async function executeQueryWithRetry(
      showLoading = true,
      attempt = 0,
      force = false,
    ): Promise<void> {
      const key = keyHash.value;

      if (!force && inFlightQueries.has(key)) {
        if (options.debug) {
          logger.debug(`[useReactiveQuery] Deduping query: ${key}`);
        }
        try {
          data.value = (await inFlightQueries.get(key)) as T;
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
      inFlightQueries.set(key, queryPromise);

      try {
        const result = await queryPromise;

        if (requestId !== activeRequestId) return;

        data.value = result;
        lastFetchTime.value = Date.now();
        isStale.value = false;
        retryCount.value = 0;

        const duration = performance.now() - startTime;
        metrics.recordQuery(key, duration);

        if (options.debug) {
          logger.debug(`[useReactiveQuery] Query executed (${duration.toFixed(1)}ms):`, result);
        }

        options.onSuccess?.(result);
      } catch (err) {
        if (requestId !== activeRequestId) return;

        const errorObj = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          const delay = calcRetryDelay(attempt, options.retryDelay);
          inFlightQueries.delete(key);
          if (options.debug) {
            logger.debug(`[useReactiveQuery] Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
          }
          await waitForRetry(delay);
          if (disposed || requestId !== activeRequestId) return;
          return executeQueryWithRetry(showLoading, attempt + 1, force);
        }

        error.value = errorObj;
        isStale.value = false;

        logger.error("[useReactiveQuery] Query failed:", err);
        metrics.recordError(key);
        options.onError?.(errorObj);
      } finally {
        if (requestId === activeRequestId) loading.value = false;
        if (inFlightQueries.get(key) === queryPromise) {
          inFlightQueries.delete(key);
        }
      }
    }

    function scheduledRefetch(changedTable?: string) {
      if (isCacheValidNow()) {
        if (options.debug) {
          logger.debug("[useReactiveQuery] Cache valid, skipping refetch");
        }
        metrics.recordCacheHit();
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        if (changedTable) metrics.recordRefetch(changedTable);
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
          logger.debug(`[useReactiveQuery] Skipping ${event.type} (not in refetchOn)`);
        }
        return false;
      }

      if (options.shouldRefetch && !options.shouldRefetch(event)) {
        if (options.debug) {
          logger.debug("[useReactiveQuery] Skipping (shouldRefetch returned false)");
        }
        return false;
      }

      return true;
    }

    const gate = createVisibilityGate();
    const visibility = options.isVisible ?? resolveVisibility();
    let unsubscribe: (() => void) | null = null;
    let stopVisibilityWatch: (() => void) | null = null;
    let stopKeyWatch: (() => void) | null = null;
    let claimedKey: string | null = null;
    let active = false;

    function activate() {
      if (active) return;
      active = true;
      claimedKey = keyHash.value;
      claimKey(claimedKey, options.tables);

      if (fetchOnMount) void executeQueryWithRetry();

      unsubscribe = deps.onTableChange(options.tables, (event) => {
        if (options.debug) {
          logger.debug("[useReactiveQuery] Table changed:", event);
        }

        if (!shouldTriggerRefetch(event)) return;

        if (gate.recordChange(visibility.value) === "refetch") {
          scheduledRefetch(event.table);
        }
      });

      stopVisibilityWatch = watch(visibility, (visible) => {
        if (visible && gate.recordVisible() === "refetch") {
          scheduledRefetch();
        }
      });

      // A moved key means the rows on screen answer a question nobody is asking any more, so the
      // cache window is dropped with it rather than keeping the previous key's data alive.
      stopKeyWatch = watch(keyHash, (next, previous) => {
        releaseKey(previous);
        claimKey(next, options.tables);
        claimedKey = next;
        lastFetchTime.value = 0;
        scheduledRefetch();
      });

      metrics.incrementListeners();
    }

    function deactivate() {
      if (!active) return;
      active = false;
      if (claimedKey !== null) {
        releaseKey(claimedKey);
        claimedKey = null;
      }
      unsubscribe?.();
      unsubscribe = null;
      stopVisibilityWatch?.();
      stopVisibilityWatch = null;
      stopKeyWatch?.();
      stopKeyWatch = null;
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
      disposed = true;
      stopEnabledWatch?.();
      deactivate();
      if (debounceTimer) clearTimeout(debounceTimer);
      abandonRetry?.();
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
