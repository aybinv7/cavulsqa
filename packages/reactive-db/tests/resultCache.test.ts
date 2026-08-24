import { test, expect } from "vite-plus/test";
import { createResultCache } from "../src/resultCache.js";

test("returns a stored value and undefined for a miss", () => {
  const cache = createResultCache(10);
  cache.set("k1", 42, ["a"]);
  expect(cache.get("k1")).toBe(42);
  expect(cache.get("missing")).toBeUndefined();
});

test("evicts the least-recently-used entry past capacity", () => {
  const cache = createResultCache(2);
  cache.set("k1", 1, ["a"]);
  cache.set("k2", 2, ["a"]);
  cache.get("k1");
  cache.set("k3", 3, ["a"]);
  expect(cache.get("k1")).toBe(1);
  expect(cache.get("k2")).toBeUndefined();
  expect(cache.get("k3")).toBe(3);
});

test("invalidateTable drops only entries depending on that table", () => {
  const cache = createResultCache(10);
  cache.set("partners", "P", ["res_partner"]);
  cache.set("products", "Q", ["product_product"]);
  cache.invalidateTable("res_partner");
  expect(cache.get("partners")).toBeUndefined();
  expect(cache.get("products")).toBe("Q");
});
