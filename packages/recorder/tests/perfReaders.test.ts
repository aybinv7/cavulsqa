import { expect, test } from "vite-plus/test";
import { readDomNodeCount, readJsHeap } from "../src/tracks/perf/readers.js";

test("readJsHeap returns null when performance.memory is missing", () => {
  expect(readJsHeap({})).toBeNull();
});

test("readJsHeap returns bytes from performance.memory when present", () => {
  const perf = { memory: { usedJSHeapSize: 1234, totalJSHeapSize: 5678 } };
  expect(readJsHeap(perf)).toEqual({ usedBytes: 1234, totalBytes: 5678 });
});

test("readJsHeap returns null when memory fields are not finite", () => {
  const perf = { memory: { usedJSHeapSize: Number.NaN, totalJSHeapSize: 5678 } };
  expect(readJsHeap(perf)).toBeNull();
});

test("readDomNodeCount returns null when there is no document", () => {
  expect(readDomNodeCount(null as unknown as Document)).toBeNull();
});

test("readDomNodeCount counts every element via getElementsByTagName", () => {
  const doc = {
    getElementsByTagName: (tag: string) => (tag === "*" ? { length: 42 } : { length: 0 }),
  } as unknown as Document;
  expect(readDomNodeCount(doc)).toBe(42);
});
