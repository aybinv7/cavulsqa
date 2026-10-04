import { expect, test } from "vite-plus/test";
import { buildPerfSample } from "../src/tracks/perf/sample.js";
import type { PerfReaders } from "../src/tracks/perf/sample.js";

const nullReaders: PerfReaders = {
  jsHeap: () => null,
  domNodes: () => null,
  battery: () => null,
};

test("returns all nulls when every reader reports unavailable", () => {
  const sample = buildPerfSample(nullReaders);
  expect(sample).toEqual({
    cpuTotal: null,
    cpuCores: null,
    memUsedPct: null,
    memUsedKb: null,
    memTotalKb: null,
    rxBps: null,
    txBps: null,
    batteryLevel: null,
    batteryCharging: null,
    batteryTemp: null,
    cpuTemp: null,
    jsHeapUsedMb: null,
    jsHeapTotalMb: null,
    domNodes: null,
  });
});

test("never contains undefined for any key", () => {
  const sample = buildPerfSample(nullReaders);
  for (const value of Object.values(sample)) {
    expect(value).not.toBeUndefined();
  }
});

test("converts jsHeap bytes to MiB", () => {
  const sample = buildPerfSample({
    ...nullReaders,
    jsHeap: () => ({ usedBytes: 10 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 }),
  });
  expect(sample.jsHeapUsedMb).toBe(10);
  expect(sample.jsHeapTotalMb).toBe(64);
});

test("passes through domNodes count", () => {
  const sample = buildPerfSample({ ...nullReaders, domNodes: () => 512 });
  expect(sample.domNodes).toBe(512);
});

test("converts battery level fraction to a 0..100 percent and passes charging through", () => {
  const sample = buildPerfSample({
    ...nullReaders,
    battery: () => ({ level: 0.5, charging: true }),
  });
  expect(sample.batteryLevel).toBe(50);
  expect(sample.batteryCharging).toBe(true);
});

test("battery level of exactly 0 is not treated as unavailable", () => {
  const sample = buildPerfSample({
    ...nullReaders,
    battery: () => ({ level: 0, charging: false }),
  });
  expect(sample.batteryLevel).toBe(0);
  expect(sample.batteryCharging).toBe(false);
});

test("a reader that throws yields nulls for that reader's fields, not a thrown error", () => {
  const sample = buildPerfSample({
    jsHeap: () => {
      throw new Error("performance.memory not supported");
    },
    domNodes: () => {
      throw new Error("no document");
    },
    battery: () => {
      throw new Error("getBattery rejected");
    },
  });
  expect(sample.jsHeapUsedMb).toBeNull();
  expect(sample.jsHeapTotalMb).toBeNull();
  expect(sample.domNodes).toBeNull();
  expect(sample.batteryLevel).toBeNull();
  expect(sample.batteryCharging).toBeNull();
});

test("non-finite reader values are treated as unavailable", () => {
  const sample = buildPerfSample({
    jsHeap: () => ({ usedBytes: Number.NaN, totalBytes: Number.POSITIVE_INFINITY }),
    domNodes: () => Number.NaN,
    battery: () => ({ level: Number.NaN, charging: true }),
  });
  expect(sample.jsHeapUsedMb).toBeNull();
  expect(sample.jsHeapTotalMb).toBeNull();
  expect(sample.domNodes).toBeNull();
  expect(sample.batteryLevel).toBeNull();
});

test("device-side fields outside WebView-observable scope stay null regardless of reader input", () => {
  const sample = buildPerfSample({
    ...nullReaders,
    jsHeap: () => ({ usedBytes: 1, totalBytes: 2 }),
    domNodes: () => 1,
    battery: () => ({ level: 1, charging: true }),
  });
  expect(sample.cpuTotal).toBeNull();
  expect(sample.cpuCores).toBeNull();
  expect(sample.memUsedPct).toBeNull();
  expect(sample.memUsedKb).toBeNull();
  expect(sample.memTotalKb).toBeNull();
  expect(sample.rxBps).toBeNull();
  expect(sample.txBps).toBeNull();
  expect(sample.batteryTemp).toBeNull();
  expect(sample.cpuTemp).toBeNull();
});
