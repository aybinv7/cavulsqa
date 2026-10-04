import type { PerfCapuSample } from "../../capu/types.js";

export interface JsHeapReading {
  usedBytes: number;
  totalBytes: number;
}

export interface BatteryReading {
  level: number;
  charging: boolean;
}

export interface PerfReaders {
  jsHeap: () => JsHeapReading | null;
  domNodes: () => number | null;
  battery: () => BatteryReading | null;
}

const BYTES_PER_MIB = 1024 * 1024;

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readSafely<T>(reader: () => T | null): T | null {
  try {
    return reader() ?? null;
  } catch {
    return null;
  }
}

/**
 * Builds one `PerfCapuSample` from injected readers. Device-side metrics a WebView cannot observe
 * are always `null`; a reader that throws or returns a non-finite number also yields `null`.
 * The result never contains `undefined` and carries exactly the `PerfCapuSample` keys.
 */
export function buildPerfSample(readers: PerfReaders): PerfCapuSample {
  const heap = readSafely(readers.jsHeap);
  const battery = readSafely(readers.battery);
  const usedBytes = finiteOrNull(heap?.usedBytes);
  const totalBytes = finiteOrNull(heap?.totalBytes);
  const level = finiteOrNull(battery?.level);
  return {
    cpuTotal: null,
    cpuCores: null,
    memUsedPct: null,
    memUsedKb: null,
    memTotalKb: null,
    rxBps: null,
    txBps: null,
    batteryLevel: level === null ? null : Math.round(level * 1000) / 10,
    batteryCharging: battery && typeof battery.charging === "boolean" ? battery.charging : null,
    batteryTemp: null,
    cpuTemp: null,
    jsHeapUsedMb: usedBytes === null ? null : usedBytes / BYTES_PER_MIB,
    jsHeapTotalMb: totalBytes === null ? null : totalBytes / BYTES_PER_MIB,
    domNodes: finiteOrNull(readSafely(readers.domNodes)),
  };
}
