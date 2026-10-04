import type { NetworkCapuTiming } from "../../capu/types.js";

/** A matched entry must start within this many milliseconds of the request's own start time. */
const MATCH_WINDOW_MS = 50;

export interface NetworkTimingResult {
  timing: NetworkCapuTiming | null;
  transferSize: number;
}

function findEntry(url: string, startedAtMs: number): PerformanceResourceTiming | null {
  if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") {
    return null;
  }
  const entries = performance.getEntriesByName(url, "resource") as PerformanceResourceTiming[];
  const origin = performance.timeOrigin ?? 0;
  let best: PerformanceResourceTiming | null = null;
  let bestDelta = Infinity;
  for (const entry of entries) {
    const entryStartMs = origin + entry.startTime;
    const delta = Math.abs(entryStartMs - startedAtMs);
    if (delta <= MATCH_WINDOW_MS && delta < bestDelta) {
      best = entry;
      bestDelta = delta;
    }
  }
  return best;
}

function relative(entry: PerformanceResourceTiming, mark: number): number {
  return mark > 0 ? Math.max(0, mark - entry.startTime) : 0;
}

function toCapuTiming(entry: PerformanceResourceTiming): NetworkCapuTiming {
  return {
    dnsStart: relative(entry, entry.domainLookupStart),
    dnsEnd: relative(entry, entry.domainLookupEnd),
    connectStart: relative(entry, entry.connectStart),
    connectEnd: relative(entry, entry.connectEnd),
    sslStart: entry.secureConnectionStart > 0 ? relative(entry, entry.secureConnectionStart) : 0,
    sslEnd: entry.secureConnectionStart > 0 ? relative(entry, entry.connectEnd) : 0,
    sendStart: relative(entry, entry.requestStart),
    sendEnd: relative(entry, entry.requestStart),
    receiveHeadersEnd: relative(entry, entry.responseStart),
  };
}

/**
 * Matches `url` against `performance.getEntriesByName`, keeping the closest entry whose start is
 * within {@link MATCH_WINDOW_MS} of `startedAtMs`. Returns `timing: null, transferSize: 0` when no
 * entry qualifies (jsdom/happy-dom included, since neither implements the Resource Timing API).
 */
export function resolveNetworkTiming(url: string, startedAtMs: number): NetworkTimingResult {
  const entry = findEntry(url, startedAtMs);
  if (!entry) return { timing: null, transferSize: 0 };
  return { timing: toCapuTiming(entry), transferSize: entry.transferSize ?? 0 };
}
