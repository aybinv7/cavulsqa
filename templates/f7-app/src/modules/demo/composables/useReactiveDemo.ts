import { computed, onUnmounted, ref, type ComputedRef, type Ref } from "vue";
import type { TableChangeEvent } from "@cavulsqa/reactive-db";
import { changeBus, getDatabase, rdb } from "@/shared/database/database";
import { uniqueQueryKey, useQueryMetrics, useReactiveQuery } from "@/shared/database/queries";
import { createNote, deleteAllNotes, listNotes, type Note } from "@/domains/note/note.repository";

export interface BusEntry {
  at: number;
  table: string;
  type: string;
  rows?: number;
}

export interface PipelineResult {
  parallelMs: number;
  sequentialMs: number;
  ratio: number;
}

const EVENT_LOG_LIMIT = 12;
const READS_PER_RUN = 5;

/**
 * Everything the demo screen shows, in one place, so the view stays presentational.
 *
 * The point being demonstrated: nothing here tells the list to refresh. `createNote` writes through
 * `rdb`, which announces the table, and the query below is watching that table.
 */
export function useReactiveDemo() {
  const notes: Ref<Note[]> = ref([]);
  const busLog = ref<BusEntry[]>([]);
  const pipeline = ref<PipelineResult | null>(null);
  const measuring = ref(false);
  const writing = ref(false);

  const query = useReactiveQuery(listNotes, {
    tables: ["note"],
    queryKey: uniqueQueryKey("demo:note-list"),
    // Long enough to make a burst of writes collapse into one refetch, and to see it happen.
    debounce: 300,
    onSuccess: (rows) => {
      notes.value = rows;
    },
  });

  // Watching the bus directly is only for the demo - a screen would let the query do it.
  const stopWatching = changeBus.on(["*"], (event: TableChangeEvent) => {
    busLog.value = [
      { at: Date.now(), table: event.table, type: event.type, rows: event.affectedRows },
      ...busLog.value,
    ].slice(0, EVENT_LOG_LIMIT);
  });

  onUnmounted(stopWatching);

  const metrics = useQueryMetrics();

  async function addOne() {
    writing.value = true;
    try {
      await createNote(rdb, { title: `Note ${String(Date.now() % 100000)}`, body: "one write" });
    } finally {
      writing.value = false;
    }
  }

  /** A burst: many writes, but the debounce means the list refetches once. */
  async function addMany(count = 20) {
    writing.value = true;
    try {
      for (let index = 0; index < count; index++) {
        await createNote(rdb, { title: `Burst ${String(index + 1)}`, body: "part of a burst" });
      }
    } finally {
      writing.value = false;
    }
  }

  async function clearAll() {
    writing.value = true;
    try {
      await deleteAllNotes(rdb);
    } finally {
      writing.value = false;
    }
  }

  /**
   * Reads issued together against reads awaited one by one. The ratio is the point: the native
   * bridge pipelines concurrent calls, and the dialect deliberately keeps reads out of the write
   * lock so a screen loading with `Promise.all` pays once rather than N times.
   */
  async function measurePipelining() {
    measuring.value = true;
    try {
      const db = getDatabase().db;
      const read = () => db.selectFrom("note").select("id").limit(5).execute();

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
      };
    } finally {
      measuring.value = false;
    }
  }

  const noteCount: ComputedRef<number> = computed(() => notes.value.length);

  return {
    notes,
    noteCount,
    loading: query.loading,
    isStale: query.isStale,
    error: query.error,
    refetch: query.refetch,
    writing,
    busLog,
    pipeline,
    measuring,
    metrics,
    addOne,
    addMany,
    clearAll,
    measurePipelining,
    readsPerRun: READS_PER_RUN,
  };
}
