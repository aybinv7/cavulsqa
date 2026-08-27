import { expect, test } from "vite-plus/test";
import { hashQueryKey } from "../src/queryKey.js";

test("keys differing only in an argument hash differently", () => {
  // The whole point: two detail pages mounted at once used to share the name "order-detail" and
  // one was handed the other's row.
  expect(hashQueryKey(["order", 1])).not.toBe(hashQueryKey(["order", 2]));
});

test("the same arguments hash alike, so the two callers share one request", () => {
  expect(hashQueryKey(["order", 1])).toBe(hashQueryKey(["order", 1]));
});

test("segment boundaries are not lost", () => {
  expect(hashQueryKey(["a", "b"])).not.toBe(hashQueryKey(["ab"]));
});

test("field order in an object does not change the identity", () => {
  expect(hashQueryKey([{ city: "Oran", status: "draft" }])).toBe(
    hashQueryKey([{ status: "draft", city: "Oran" }]),
  );
});

test("nested objects are sorted too", () => {
  expect(hashQueryKey([{ filter: { b: 2, a: 1 } }])).toBe(
    hashQueryKey([{ filter: { a: 1, b: 2 } }]),
  );
});

test("types are not conflated", () => {
  expect(hashQueryKey([1])).not.toBe(hashQueryKey(["1"]));
  expect(hashQueryKey([null])).not.toBe(hashQueryKey([0]));
});

test("a function in a key is refused rather than silently dropped", () => {
  // JSON.stringify omits functions, so two different queries would hash alike and share results.
  expect(() => hashQueryKey(["order", () => 1])).toThrow(/cannot contain a function/);
});

test("a symbol in a key is refused", () => {
  expect(() => hashQueryKey(["order", Symbol("id")])).toThrow(/cannot contain a symbol/);
});
