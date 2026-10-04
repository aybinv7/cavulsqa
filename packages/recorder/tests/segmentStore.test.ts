import { expect, test } from "vite-plus/test";
import { createMemorySegmentStore, createOpfsSegmentStore } from "../src/capu/segmentStore.js";

test("memory store appends, rotates, lists, reads and evicts round trip", async () => {
  const store = createMemorySegmentStore();
  expect(store.backend).toBe("memory");

  await store.append("console", '{"t":0,"data":"a"}\n');
  await store.append("console", '{"t":1,"data":"b"}\n');
  await store.rotate("console");
  await store.append("console", '{"t":2,"data":"c"}\n');

  const segments = await store.list("console");
  expect(segments).toHaveLength(2);
  expect(segments[0]?.index).toBe(0);
  expect(segments[1]?.index).toBe(1);

  const first = await store.read("console", 0);
  expect(first).toBe('{"t":0,"data":"a"}\n{"t":1,"data":"b"}\n');
  const second = await store.read("console", 1);
  expect(second).toBe('{"t":2,"data":"c"}\n');

  await store.evict("console", 0);
  const afterEvict = await store.list("console");
  expect(afterEvict).toHaveLength(1);
  expect(afterEvict[0]?.index).toBe(1);

  await store.clear();
  expect(await store.list("console")).toHaveLength(0);
});

test("memory store tracks independent segments per track", async () => {
  const store = createMemorySegmentStore();
  await store.append("network", '{"t":0,"data":1}\n');
  await store.append("perf", '{"t":0,"data":2}\n');
  expect(await store.list("console")).toHaveLength(0);
  expect(await store.list("network")).toHaveLength(1);
  expect(await store.list("perf")).toHaveLength(1);
});

test("segment byte size reflects the appended UTF-8 content", async () => {
  const store = createMemorySegmentStore();
  const line = '{"t":0,"data":"hello"}\n';
  await store.append("databases", line);
  const [segment] = await store.list("databases");
  expect(segment?.bytes).toBe(new TextEncoder().encode(line).length);
});

test("createOpfsSegmentStore falls back to the memory backend when OPFS is unavailable", async () => {
  expect(typeof navigator.storage?.getDirectory).toBe("undefined");
  const store = await createOpfsSegmentStore("capu_test_session");
  expect(store.backend).toBe("memory");
  await store.append("rrweb", '{"t":0,"data":{}}\n');
  expect(await store.list("rrweb")).toHaveLength(1);
});
