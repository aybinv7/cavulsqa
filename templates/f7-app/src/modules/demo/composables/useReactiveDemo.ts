import { Capacitor } from "@capacitor/core";
import type { TableChangeEvent } from "@cavulsqa/reactive-db";
import {
  advanceOrderStatus,
  clearAll,
  deleteOrder,
  ensureReferenceData,
  loadDashboardStats,
  saveOrder,
  searchOrders,
  seedSampleData,
  setOrderStatus,
  type DashboardStats,
  type DraftLine,
  type OrderRow,
} from "@/domains/sales/sales.repository";
import { activeStorageLabel, changeBus, getDatabase, rdb } from "@/shared/database/database";
import { useReactiveQuery } from "@/shared/database/queries";

export interface BusEntry {
  /** Monotonic, because a millisecond timestamp is not unique - several events share one. */
  id: number;
  at: number;
  table: string;
  type: string;
}

export interface PipelineResult {
  parallelMs: number;
  sequentialMs: number;
  ratio: number;
  /** Recorded with the numbers, because a measurement without its engine is not comparable. */
  engine: string;
}

const EVENT_LOG_LIMIT = 20;
const READS_PER_RUN = 5;
const EMPTY_STATS: DashboardStats = {
  customers: 0,
  products: 0,
  orders: 0,
  draft: 0,
  confirmed: 0,
  delivered: 0,
  revenueCents: 0,
  committedCents: 0,
};

/**
 * Everything the Reactive screen shows, so the view stays presentational.
 *
 * Nothing here tells a query to refresh. Writes go through `rdb`, which announces the tables they
 * touched, and both queries below watch those tables - which is why creating one order moves the
 * revenue tile, the order count and the list at the same time.
 */
export function useReactiveDemo() {
  const busy = ref(false);
  const busLog = ref<BusEntry[]>([]);
  const pipeline = ref<PipelineResult | null>(null);
  const measuring = ref(false);

  const statsQuery = useReactiveQuery(() => loadDashboardStats(getDatabase().db), {
    // Four tables, because the tiles aggregate across all of them.
    tables: ["customer", "product", "sales_order", "order_line"],
    queryKey: ["demo:stats"],
    debounce: 250,
  });

  const ordersQuery = useReactiveQuery(() => searchOrders(getDatabase().db, ""), {
    tables: ["sales_order", "order_line", "customer"],
    queryKey: ["demo:orders"],
    debounce: 250,
  });

  let busSequence = 0;
  const stopWatching = changeBus.on(["*"], (event: TableChangeEvent) => {
    busSequence += 1;
    busLog.value = [
      { id: busSequence, at: Date.now(), table: event.table, type: event.type },
      ...busLog.value,
    ].slice(0, EVENT_LOG_LIMIT);
  });
  onUnmounted(stopWatching);

  const stats = computed<DashboardStats>(() => statsQuery.data.value ?? EMPTY_STATS);
  const orders = computed<OrderRow[]>(() => ordersQuery.data.value ?? []);

  async function withBusy(work: () => Promise<void>): Promise<void> {
    busy.value = true;
    try {
      await work();
    } finally {
      busy.value = false;
    }
  }

  const seed = () => withBusy(() => seedSampleData(rdb));

  const advance = (orderId: number) => withBusy(() => advanceOrderStatus(rdb, orderId));

  const setStatus = (orderId: number, status: "draft" | "confirmed" | "delivered") =>
    withBusy(() => setOrderStatus(rdb, orderId, status));

  const remove = (orderId: number) => withBusy(() => deleteOrder(rdb, orderId));

  const save = (input: { customerId: number; reference: string; lines: DraftLine[] }) =>
    withBusy(() => saveOrder(rdb, input));
  /**
   * Wipe the demo data, then put the catalogue back. Deleting the products and customers too would
   * leave the app in a state where no order can be written and the only way out is a restart.
   */
  const clear = () =>
    withBusy(async () => {
      await clearAll(rdb);
      await ensureReferenceData(rdb);
    });

  /**
   * Reads issued together against reads awaited one by one.
   *
   * The worker executes statements one at a time, so this measures how much of a read is the message
   * round trip rather than the query - it cannot show queries overlapping, and a ratio near 1x is
   * the expected result rather than a regression.
   */
  async function measurePipelining(): Promise<void> {
    measuring.value = true;
    try {
      const db = getDatabase().db;
      const read = () => db.selectFrom("sales_order").select("id").limit(5).execute();
      await read();

      const parallelStart = performance.now();
      await Promise.all(Array.from({ length: READS_PER_RUN }, read));
      const parallelMs = performance.now() - parallelStart;

      const sequentialStart = performance.now();
      for (let index = 0; index < READS_PER_RUN; index++) await read();
      const sequentialMs = performance.now() - sequentialStart;

      pipeline.value = {
        parallelMs: Number(parallelMs.toFixed(1)),
        sequentialMs: Number(sequentialMs.toFixed(1)),
        ratio: Number((sequentialMs / Math.max(parallelMs, 0.01)).toFixed(2)),
        engine: activeStorageLabel(),
      };
    } finally {
      measuring.value = false;
    }
  }

  return {
    stats,
    orders,
    loading: ordersQuery.loading,
    busy,
    busLog,
    pipeline,
    measuring,
    readsPerRun: READS_PER_RUN,
    isNative: Capacitor.isNativePlatform(),
    engineName: activeStorageLabel(),
    platform: Capacitor.getPlatform(),
    seed,
    advance,
    setStatus,
    remove,
    save,
    clear,
    measurePipelining,
  };
}
