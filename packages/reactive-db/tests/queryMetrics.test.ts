import { test, expect } from "vite-plus/test";
import { createQueryMetrics, type QueryMetricsState } from "../src/queryMetrics.js";

test("recordQuery accumulates count, totalTime, and avgTime per query key", () => {
  const metrics = createQueryMetrics();
  metrics.recordQuery("customer:list", 100);
  metrics.recordQuery("customer:list", 200);

  const state = metrics.getState();
  expect(state.queries["customer:list"]).toMatchObject({
    count: 2,
    totalTime: 300,
    avgTime: 150,
    lastTime: 200,
  });
});

test("recordError increments the error count for a query key", () => {
  const metrics = createQueryMetrics();
  metrics.recordError("customer:list");
  metrics.recordError("customer:list");
  expect(metrics.getState().errors["customer:list"]).toBe(2);
});

test("recordCacheHit increments the global cache-hit counter", () => {
  const metrics = createQueryMetrics();
  metrics.recordCacheHit();
  metrics.recordCacheHit();
  expect(metrics.getState().cacheHits).toBe(2);
});

test("recordRefetch increments the per-table refetch counter", () => {
  const metrics = createQueryMetrics();
  metrics.recordRefetch("res_partner");
  expect(metrics.getState().refetchesByTable.res_partner).toBe(1);
});

test("incrementListeners and decrementListeners track active listener count, floored at 0", () => {
  const metrics = createQueryMetrics();
  metrics.decrementListeners();
  expect(metrics.getState().activeListeners).toBe(0);

  metrics.incrementListeners();
  metrics.incrementListeners();
  metrics.decrementListeners();
  expect(metrics.getState().activeListeners).toBe(1);
});

test("reset clears queries, errors, cacheHits, and refetch counts", () => {
  const metrics = createQueryMetrics();
  metrics.recordQuery("a", 10);
  metrics.recordError("a");
  metrics.recordCacheHit();
  metrics.recordRefetch("res_partner");

  metrics.reset();

  const state = metrics.getState();
  expect(state.queries).toEqual({});
  expect(state.errors).toEqual({});
  expect(state.cacheHits).toBe(0);
  expect(state.refetchesByTable).toEqual({});
});

test("toggleDevTools flips the flag by default, or sets it explicitly", () => {
  const metrics = createQueryMetrics();
  expect(metrics.getState().isDevToolsOpen).toBe(false);

  metrics.toggleDevTools();
  expect(metrics.getState().isDevToolsOpen).toBe(true);

  metrics.toggleDevTools(false);
  expect(metrics.getState().isDevToolsOpen).toBe(false);
});

test("query entries beyond maxEntries are pruned by oldest lastSeen", () => {
  const metrics = createQueryMetrics({ maxEntries: 2 });
  metrics.recordQuery("a", 10);
  metrics.recordQuery("b", 10);
  metrics.recordQuery("c", 10);

  const keys = Object.keys(metrics.getState().queries);
  expect(keys).toHaveLength(2);
  expect(keys).not.toContain("a");
});

test("wrapState is applied to the initial state object, so external reactivity wrappers see all mutations", () => {
  let wrapped: unknown;
  const metrics = createQueryMetrics({
    wrapState: (state: QueryMetricsState) => {
      wrapped = state;
      return state;
    },
  });

  metrics.recordCacheHit();
  expect((wrapped as { cacheHits: number }).cacheHits).toBe(1);
});
