import type { PerfCapuSample } from "../../capu/types.js";
import type { TrackContext, TrackRecorder } from "../../recorder/types.js";
import { createBatteryReader } from "./battery.js";
import type { BatteryReader } from "./battery.js";
import { readDomNodeCount, readJsHeap } from "./readers.js";
import { buildPerfSample } from "./sample.js";
import type { BatteryReading, JsHeapReading } from "./sample.js";

export const DEFAULT_PERF_INTERVAL_MS = 2000;

export interface PerfTrackOptions {
  /** Sampling period in milliseconds. Defaults to `DEFAULT_PERF_INTERVAL_MS` (2 000). */
  intervalMs?: number;
  /** Overrides the `performance.memory` reader. Tests inject a stub here. */
  readJsHeap?: () => JsHeapReading | null;
  /** Overrides the DOM node counter. Tests inject a stub here. */
  readDomNodes?: () => number | null;
  /** Overrides the battery reader factory. Tests inject a stub here. */
  createBatteryReader?: () => BatteryReader;
  /** Overrides the visibility probe; sampling is skipped while it returns `"hidden"`. */
  visibilityState?: () => DocumentVisibilityState | undefined;
}

function defaultVisibilityState(): DocumentVisibilityState | undefined {
  return globalThis.document?.visibilityState;
}

function resolveInterval(intervalMs: number | undefined): number {
  return intervalMs !== undefined && Number.isFinite(intervalMs) && intervalMs > 0
    ? intervalMs
    : DEFAULT_PERF_INTERVAL_MS;
}

/**
 * Perf track for a Capacitor WebView. Every `intervalMs` it pushes one `PerfCapuSample` built from
 * `performance.memory`, the document element count and the Battery Status API; every device-side
 * field is `null`. Sampling is skipped while the document is hidden so a backgrounded app does no
 * DOM walk. `stop` clears the interval and releases the battery listeners.
 */
export function createPerfTrack(options: PerfTrackOptions = {}): TrackRecorder<PerfCapuSample> {
  const intervalMs = resolveInterval(options.intervalMs);
  const jsHeap = options.readJsHeap ?? readJsHeap;
  const domNodes = options.readDomNodes ?? readDomNodeCount;
  const batteryFactory = options.createBatteryReader ?? createBatteryReader;
  const visibilityState = options.visibilityState ?? defaultVisibilityState;

  let timer: ReturnType<typeof setInterval> | null = null;
  let battery: BatteryReader | null = null;
  let context: TrackContext<PerfCapuSample> | null = null;

  const readBattery = (): BatteryReading | null => battery?.read() ?? null;

  const sample = () => {
    if (!context) return;
    if (visibilityState() === "hidden") return;
    context.push(buildPerfSample({ jsHeap, domNodes, battery: readBattery }));
  };

  const clear = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    battery?.dispose();
    battery = null;
  };

  return {
    name: "perf",
    async start(ctx) {
      clear();
      context = ctx;
      battery = batteryFactory();
      timer = setInterval(sample, intervalMs);
    },
    async stop() {
      clear();
      context = null;
    },
  };
}
