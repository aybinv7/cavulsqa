import { expect, test, vi } from "vite-plus/test";
import { createApp, defineComponent, h } from "vue";
import { createChangeBus } from "@cavulsqa/reactive-db";
import { createReactiveQuery } from "../src/reactiveQuery.js";
import { uniqueQueryKey } from "../src/queryKeys.js";

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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("uniqueQueryKey never repeats a key for the same prefix", () => {
  const first = uniqueQueryKey("sale:list");
  const second = uniqueQueryKey("sale:list");

  expect(first).not.toBe(second);
  expect(first.startsWith("sale:list#")).toBe(true);
});

test("a unique key opts out of deduplication", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(queryFn, { tables: ["sale_order"], queryKey: uniqueQueryKey("sale:list") }),
  );
  const second = mount(() =>
    useReactiveQuery(queryFn, { tables: ["sale_order"], queryKey: uniqueQueryKey("sale:list") }),
  );

  await flush();
  expect(queryFn).toHaveBeenCalledTimes(2);
  first();
  second();
});

test("two mounted queries sharing a key across different tables are reported", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const first = mount(() =>
    useReactiveQuery(() => Promise.resolve("a"), {
      tables: ["sale_order"],
      queryKey: "collides",
    }),
  );
  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), {
      tables: ["partner"],
      queryKey: "collides",
    }),
  );

  await flush();
  expect(warn).toHaveBeenCalledOnce();
  expect(warn.mock.calls[0]?.[0]).toContain('queryKey "collides"');
  first();
  second();
  warn.mockRestore();
});

test("the same query mounted twice shares its key without complaint", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const options = { tables: ["sale_order"], queryKey: "shared:list" };
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
    useReactiveQuery(() => Promise.resolve("a"), { tables: ["sale_order"], queryKey: "reused" }),
  );
  await flush();
  first();

  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), { tables: ["partner"], queryKey: "reused" }),
  );
  await flush();

  expect(warn).not.toHaveBeenCalled();
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
    useReactiveQuery(() => Promise.resolve("a"), { tables: ["sale_order"], queryKey: "quiet" }),
  );
  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), { tables: ["partner"], queryKey: "quiet" }),
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
      queryKey: uniqueQueryKey("sale:visible"),
      debounce: 5,
    }),
  );

  await flush();
  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await new Promise((resolve) => setTimeout(resolve, 30));

  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});
