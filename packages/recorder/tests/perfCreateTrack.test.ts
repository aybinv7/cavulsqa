import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { silentLogger } from "../src/recorder/logger.js";
import type { TrackContext } from "../src/recorder/types.js";
import { createPerfTrack, DEFAULT_PERF_INTERVAL_MS } from "../src/tracks/perf/createPerfTrack.js";
import type { PerfCapuSample } from "../src/capu/types.js";
import type { BatteryReader } from "../src/tracks/perf/battery.js";

function fakeContext(): TrackContext<PerfCapuSample> & { pushed: PerfCapuSample[] } {
  const pushed: PerfCapuSample[] = [];
  return {
    pushed,
    push: (data: PerfCapuSample) => {
      pushed.push(data);
    },
    startedAt: 0,
    logger: silentLogger,
  };
}

function stubBatteryReader(read: BatteryReader["read"] = () => null): BatteryReader {
  return { read, dispose: vi.fn() };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("defaults to sampling every DEFAULT_PERF_INTERVAL_MS", async () => {
  const ctx = fakeContext();
  const track = createPerfTrack({
    readJsHeap: () => null,
    readDomNodes: () => null,
    createBatteryReader: () => stubBatteryReader(),
    visibilityState: () => "visible",
  });

  await track.start(ctx);
  expect(ctx.pushed).toHaveLength(0);

  await vi.advanceTimersByTimeAsync(DEFAULT_PERF_INTERVAL_MS);
  expect(ctx.pushed).toHaveLength(1);

  await vi.advanceTimersByTimeAsync(DEFAULT_PERF_INTERVAL_MS);
  expect(ctx.pushed).toHaveLength(2);

  await track.stop();
});

test("uses a custom intervalMs", async () => {
  const ctx = fakeContext();
  const track = createPerfTrack({
    intervalMs: 500,
    readJsHeap: () => null,
    readDomNodes: () => null,
    createBatteryReader: () => stubBatteryReader(),
    visibilityState: () => "visible",
  });

  await track.start(ctx);
  await vi.advanceTimersByTimeAsync(500);
  expect(ctx.pushed).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1000);
  expect(ctx.pushed).toHaveLength(3);

  await track.stop();
});

test("stop clears the interval so no further samples are pushed", async () => {
  const ctx = fakeContext();
  const track = createPerfTrack({
    intervalMs: 100,
    readJsHeap: () => null,
    readDomNodes: () => null,
    createBatteryReader: () => stubBatteryReader(),
    visibilityState: () => "visible",
  });

  await track.start(ctx);
  await vi.advanceTimersByTimeAsync(100);
  expect(ctx.pushed).toHaveLength(1);

  await track.stop();
  await vi.advanceTimersByTimeAsync(1000);
  expect(ctx.pushed).toHaveLength(1);
});

test("stop disposes the battery reader", async () => {
  const ctx = fakeContext();
  const battery = stubBatteryReader();
  const track = createPerfTrack({
    intervalMs: 100,
    readJsHeap: () => null,
    readDomNodes: () => null,
    createBatteryReader: () => battery,
    visibilityState: () => "visible",
  });

  await track.start(ctx);
  await track.stop();

  expect(battery.dispose).toHaveBeenCalledTimes(1);
});

test("skips sampling while document.visibilityState is hidden", async () => {
  const ctx = fakeContext();
  let visibility: DocumentVisibilityState = "hidden";
  const track = createPerfTrack({
    intervalMs: 100,
    readJsHeap: () => null,
    readDomNodes: () => null,
    createBatteryReader: () => stubBatteryReader(),
    visibilityState: () => visibility,
  });

  await track.start(ctx);
  await vi.advanceTimersByTimeAsync(300);
  expect(ctx.pushed).toHaveLength(0);

  visibility = "visible";
  await vi.advanceTimersByTimeAsync(100);
  expect(ctx.pushed).toHaveLength(1);

  await track.stop();
});

test("pushed sample reflects the injected readers, including the battery reader", async () => {
  const ctx = fakeContext();
  const track = createPerfTrack({
    intervalMs: 100,
    readJsHeap: () => ({ usedBytes: 2 * 1024 * 1024, totalBytes: 4 * 1024 * 1024 }),
    readDomNodes: () => 128,
    createBatteryReader: () => stubBatteryReader(() => ({ level: 0.4, charging: true })),
    visibilityState: () => "visible",
  });

  await track.start(ctx);
  await vi.advanceTimersByTimeAsync(100);

  expect(ctx.pushed[0]).toEqual(
    expect.objectContaining({
      jsHeapUsedMb: 2,
      jsHeapTotalMb: 4,
      domNodes: 128,
      batteryLevel: 40,
      batteryCharging: true,
    }),
  );

  await track.stop();
});

test("start after a previous start replaces the interval and battery reader instead of leaking them", async () => {
  const ctx = fakeContext();
  const firstBattery = stubBatteryReader();
  const secondBattery = stubBatteryReader();
  let callCount = 0;
  const track = createPerfTrack({
    intervalMs: 100,
    readJsHeap: () => null,
    readDomNodes: () => null,
    createBatteryReader: () => (callCount++ === 0 ? firstBattery : secondBattery),
    visibilityState: () => "visible",
  });

  await track.start(ctx);
  await track.start(ctx);

  expect(firstBattery.dispose).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(100);
  expect(ctx.pushed).toHaveLength(1);

  await track.stop();
  expect(secondBattery.dispose).toHaveBeenCalledTimes(1);
});

test("name is 'perf'", () => {
  const track = createPerfTrack();
  expect(track.name).toBe("perf");
});
