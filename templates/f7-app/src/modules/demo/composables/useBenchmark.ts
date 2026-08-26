import {
  runBenchmark,
  type CaseResult,
  type SuiteResult,
} from "@/domains/benchmark/benchmark.suite";
import { activePragmas, activeStorage, activeStorageLabel, rdb } from "@/shared/database/database";
import type { StorageId } from "@/shared/database/candidates";

const STORAGE_KEY = "app.benchmark.results";

export interface CaseComparison {
  name: string;
  group: CaseResult["group"];
  note?: string;
  current: CaseResult;
  other?: CaseResult;
  /** How many times faster the current engine is at this case. Below 1 means slower. */
  speedup?: number;
}

/**
 * Results are kept per engine in localStorage, because the comparison is the point and an engine
 * switch needs a restart - so the two halves can never be in memory at the same time.
 */
function readStored(): Partial<Record<StorageId, SuiteResult>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<StorageId, SuiteResult>>) : {};
  } catch {
    return {};
  }
}

function writeStored(all: Partial<Record<StorageId, SuiteResult>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Out of quota or storage disabled: the run still displayed, it just will not be remembered.
  }
}

export function useBenchmark() {
  const engine = activeStorage().id;
  const stored = ref(readStored());
  const running = ref(false);
  const progress = ref("");
  const failure = ref<string | null>(null);

  const result = computed<SuiteResult | null>(() => stored.value[engine] ?? null);

  /** The most recent run on any other engine, which is what the current one is measured against. */
  const baseline = computed<SuiteResult | null>(() => {
    const others = Object.entries(stored.value)
      .filter(([key]) => key !== engine)
      .map(([, value]) => value)
      .filter((value): value is SuiteResult => Boolean(value));
    return others.sort((a, b) => b.at - a.at)[0] ?? null;
  });

  const comparison = computed<CaseComparison[]>(() => {
    const current = result.value;
    if (!current) return [];

    return current.cases.map((entry) => {
      const other = baseline.value?.cases.find((candidate) => candidate.name === entry.name);
      const speedup =
        other && entry.msPerOperation > 0
          ? Number((other.msPerOperation / entry.msPerOperation).toFixed(2))
          : undefined;
      return {
        name: entry.name,
        group: entry.group,
        note: entry.note,
        current: entry,
        other,
        speedup,
      };
    });
  });

  async function run(): Promise<void> {
    if (running.value) return;
    running.value = true;
    failure.value = null;
    progress.value = "";

    try {
      /**
       * Reads take the raw Kysely instance and writes go through `rdb`, exactly as the app does -
       * measuring a write that skipped the change bus would measure something the app never runs.
       * The suite's own tables are not watched by any query, so nothing refetches while it runs.
       */
      const finished = await runBenchmark(rdb, (name) => {
        progress.value = name;
      });

      const next = {
        ...stored.value,
        [engine]: {
          ...finished,
          engine: activeStorageLabel(),
          pragmas: activePragmas(),
          at: Date.now(),
        },
      };
      stored.value = next;
      writeStored(next);
    } catch (error) {
      failure.value = error instanceof Error ? error.message : String(error);
    } finally {
      running.value = false;
      progress.value = "";
    }
  }

  function clear(): void {
    stored.value = {};
    writeStored({});
  }

  /** For pasting a run into an issue or a commit message rather than retyping numbers. */
  function asJson(): string {
    return JSON.stringify(stored.value, null, 2);
  }

  return {
    engine,
    engineName: activeStorageLabel(),
    running,
    progress,
    failure,
    result,
    baseline,
    comparison,
    run,
    clear,
    asJson,
  };
}
