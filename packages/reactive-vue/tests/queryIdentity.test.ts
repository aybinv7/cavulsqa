import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { createApp, defineComponent, h, ref } from "vue";
import { createChangeBus } from "@cavulsqa/reactive-db";
import { createReactiveQuery } from "../src/reactiveQuery.js";

function mount(setup: () => unknown): () => void {
  const app = createApp(
    defineComponent({
      setup() {
        setup();
        return () => h("div");
      },
    }),
  );
  app.mount(document.createElement("div"));
  return () => app.unmount();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const flush = () => vi.advanceTimersByTimeAsync(0);

test("two pages showing different rows each run their own query", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(queryFn, { tables: ["sale_order"], queryKey: ["order", 1] }),
  );
  const second = mount(() =>
    useReactiveQuery(queryFn, { tables: ["sale_order"], queryKey: ["order", 2] }),
  );

  await flush();
  // Under a caller-invented name both were "order-detail", so the second awaited the first's
  // promise and rendered order 1 while its route said 2.
  expect(queryFn).toHaveBeenCalledTimes(2);
  first();
  second();
});

test("two pages showing the same row share one request", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(queryFn, { tables: ["sale_order"], queryKey: ["order", 7] }),
  );
  const second = mount(() =>
    useReactiveQuery(queryFn, { tables: ["sale_order"], queryKey: ["order", 7] }),
  );

  await flush();
  expect(queryFn).toHaveBeenCalledTimes(1);
  first();
  second();
});

test("a key that is a ref re-runs the query when it moves", async () => {
  const bus = createChangeBus();
  const term = ref("a");
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["search", term],
      debounce: 20,
    }),
  );

  await flush();
  expect(queryFn).toHaveBeenCalledTimes(1);

  term.value = "ab";
  await vi.advanceTimersByTimeAsync(50);

  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});

test("a key that moves twice inside the debounce window runs once", async () => {
  const bus = createChangeBus();
  const term = ref("a");
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["search", term],
      debounce: 20,
    }),
  );

  await flush();
  term.value = "ab";
  await vi.advanceTimersByTimeAsync(5);
  term.value = "abc";
  await vi.advanceTimersByTimeAsync(50);

  // Typing used to bypass the debounce entirely, because the screen called refetch() per keystroke.
  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});

test("a key that moves does not serve the previous key's cached rows", async () => {
  const bus = createChangeBus();
  const term = ref("a");
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["search", term],
      debounce: 5,
      cacheTime: 60_000,
    }),
  );

  await flush();
  term.value = "ab";
  await vi.advanceTimersByTimeAsync(30);

  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});

test("two mounted queries sharing a key across different tables are reported", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(() => Promise.resolve("a"), {
      tables: ["sale_order"],
      queryKey: ["collides"],
    }),
  );
  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), {
      tables: ["partner"],
      queryKey: ["collides"],
    }),
  );

  await flush();
  expect(warn).toHaveBeenCalledOnce();
  expect(warn.mock.calls[0]?.[0]).toContain('["collides"]');
  first();
  second();
  warn.mockRestore();
});

test("the same query mounted twice shares its key without complaint", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const options = { tables: ["sale_order"], queryKey: ["shared", "list"] };
  const first = mount(() => useReactiveQuery(() => Promise.resolve("a"), options));
  const second = mount(() => useReactiveQuery(() => Promise.resolve("a"), options));

  await flush();
  expect(warn).not.toHaveBeenCalled();
  first();
  second();
  warn.mockRestore();
});

test("a key is released on unmount, so reusing it later is not a conflict", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(() => Promise.resolve("a"), { tables: ["sale_order"], queryKey: ["reused"] }),
  );
  await flush();
  first();

  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), { tables: ["partner"], queryKey: ["reused"] }),
  );
  await flush();

  expect(warn).not.toHaveBeenCalled();
  second();
  warn.mockRestore();
});

test("a key released on a move is not still held by its old value", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const term = ref("a");
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(() => Promise.resolve("a"), {
      tables: ["sale_order"],
      queryKey: ["search", term],
    }),
  );
  await flush();
  term.value = "b";
  await flush();

  // Claiming on activate and releasing the *current* key would leak the key it started with.
  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), {
      tables: ["partner"],
      queryKey: ["search", "a"],
    }),
  );
  await flush();

  expect(warn).not.toHaveBeenCalled();
  first();
  second();
  warn.mockRestore();
});

test("warnOnKeyConflict: false silences the report", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    warnOnKeyConflict: false,
  });

  const first = mount(() =>
    useReactiveQuery(() => Promise.resolve("a"), { tables: ["sale_order"], queryKey: ["quiet"] }),
  );
  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), { tables: ["partner"], queryKey: ["quiet"] }),
  );

  await flush();
  expect(warn).not.toHaveBeenCalled();
  first();
  second();
  warn.mockRestore();
});

test("visibility defaults to always-visible when no adapter is given", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["sale", "visible"],
      debounce: 5,
    }),
  );

  await flush();
  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await vi.advanceTimersByTimeAsync(30);

  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});
