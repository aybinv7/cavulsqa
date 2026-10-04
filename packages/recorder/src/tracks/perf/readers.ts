import type { JsHeapReading } from "./sample.js";

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}

interface PerformanceWithMemory {
  memory?: PerformanceMemory;
}

/**
 * Reads `performance.memory` (Chromium-only, present in Android WebView). Returns `null` where the
 * API is missing or its fields are not finite numbers.
 */
export function readJsHeap(perf: unknown = globalThis.performance): JsHeapReading | null {
  const memory = (perf as PerformanceWithMemory | undefined)?.memory;
  if (!memory) return null;
  const { usedJSHeapSize, totalJSHeapSize } = memory;
  if (!Number.isFinite(usedJSHeapSize) || !Number.isFinite(totalJSHeapSize)) return null;
  return { usedBytes: usedJSHeapSize, totalBytes: totalJSHeapSize };
}

/**
 * Counts every element in the document with a single `getElementsByTagName("*")` call. Returns
 * `null` when there is no document.
 */
export function readDomNodeCount(doc: Document | undefined = globalThis.document): number | null {
  if (!doc || typeof doc.getElementsByTagName !== "function") return null;
  return doc.getElementsByTagName("*").length;
}
