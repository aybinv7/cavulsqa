import { expect, test } from "vite-plus/test";
import { decideEviction } from "../src/recorder/retention.js";
import type { SegmentMeta } from "../src/capu/segmentStore.js";

function segment(index: number, startMs: number, bytes: number): SegmentMeta {
  return { index, startMs, bytes };
}

test("evicts segments older than maxMs while always keeping the newest one", () => {
  const now = 200_000;
  const plan = decideEviction(
    {
      console: [segment(0, 0, 10), segment(1, 60_000, 10), segment(2, 120_000, 10)],
    },
    { maxMs: 60_000, maxBytes: Number.POSITIVE_INFINITY },
    now,
  );
  expect(plan.console).toEqual([0, 1]);
});

test("evicts segments over maxBytes oldest-first, keeping the newest", () => {
  const plan = decideEviction(
    {
      network: [segment(0, 0, 50), segment(1, 60_000, 50), segment(2, 120_000, 50)],
    },
    { maxMs: Number.POSITIVE_INFINITY, maxBytes: 60 },
    180_000,
  );
  expect(plan.network).toEqual([0, 1]);
});

test("keeps everything within both bounds", () => {
  const plan = decideEviction(
    { perf: [segment(0, 0, 10), segment(1, 60_000, 10)] },
    { maxMs: 120_000, maxBytes: 1000 },
    70_000,
  );
  expect(plan.perf ?? []).toEqual([]);
});

test("with maxMs 120_000 and three 60s rrweb segments, only segments before the last full-snapshot-bearing window survive", () => {
  const now = 180_000;
  const plan = decideEviction(
    {
      rrweb: [segment(0, 0, 10), segment(1, 60_000, 10), segment(2, 120_000, 10)],
    },
    { maxMs: 120_000, maxBytes: Number.POSITIVE_INFINITY },
    now,
  );
  expect(plan.rrweb).toEqual([0]);
});

test("non-rrweb tracks are aligned to the rrweb ring buffer's oldest surviving segment", () => {
  const now = 180_000;
  const plan = decideEviction(
    {
      rrweb: [segment(0, 0, 10), segment(1, 60_000, 10), segment(2, 120_000, 10)],
      console: [segment(0, 0, 10), segment(1, 30_000, 10), segment(2, 90_000, 10)],
    },
    { maxMs: 120_000, maxBytes: Number.POSITIVE_INFINITY },
    now,
  );
  expect(plan.rrweb).toEqual([0]);
  expect(plan.console).toEqual([0, 1]);
});

test("a track with no segments is left out of the plan", () => {
  const plan = decideEviction({}, { maxMs: 1000, maxBytes: 1000 }, 5000);
  expect(plan).toEqual({});
});
