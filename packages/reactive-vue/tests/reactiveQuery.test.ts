import { expect, test, vi } from "vite-plus/test";
import { createApp, defineComponent, h, ref, type Ref } from "vue";
import { createChangeBus, type TableChangeEvent } from "@cavulsqa/reactive-db";
import { createReactiveQuery, type ReactiveQuery } from "../src/reactiveQuery.js";

const ALWAYS_VISIBLE = { value: true };

function mount<T>(setup: () => ReactiveQuery<T>): { query: ReactiveQuery<T>; unmount: () => void } {
  let captured: ReactiveQuery<T> | null = null;

  const app = createApp(
    defineComponent({
      setup() {
        captured = setup();
        return () => h("div");
      },
    }),
  );

  const host = document.createElement("div");
  app.mount(host);

  if (!captured) throw new Error("setup did not run");
  return { query: captured, unmount: () => app.unmount() };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const afterDebounce = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("fetches on mount and exposes the result", async () => {
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const { query, unmount } = mount(() =>
    useReactiveQuery(() => Promise.resolve("first"), {
      tables: ["sale_order"],
      queryKey: "sale:list",
      isVisible: ALWAYS_VISIBLE,
    }),
  );

  await flush();
  expect(query.data.value).toBe("first");
  expect(query.loading.value).toBe(false);
  unmount();
});

test("a table change refetches after the debounce window", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const { unmount } = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: "sale:refetch",
      debounce: 5,
      isVisible: ALWAYS_VISIBLE,
    }),
  );

  await flush();
  expect(queryFn).toHaveBeenCalledTimes(1);

  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await afterDebounce(30);

  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});

test("refetchOn filters the change types that trigger a refetch", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const { unmount } = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: "sale:filtered",
      debounce: 5,
      refetchOn: ["insert"],
      isVisible: ALWAYS_VISIBLE,
    }),
  );

  await flush();
  bus.emit("sale_order", "update", { timestamp: Date.now() });
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(1);

  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});

test("enabled: false defers the first read until it flips", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const enabled: Ref<boolean> = ref(false);
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const { unmount } = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: "sale:deferred",
      enabled,
      isVisible: ALWAYS_VISIBLE,
    }),
  );

  await flush();
  expect(queryFn).not.toHaveBeenCalled();

  enabled.value = true;
  await flush();
  expect(queryFn).toHaveBeenCalledTimes(1);
  unmount();
});

test("unmounting drops the table subscription", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const { unmount } = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: "sale:unmount",
      debounce: 5,
      isVisible: ALWAYS_VISIBLE,
    }),
  );

  await flush();
  unmount();

  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(1);
});

test("a failing query surfaces the error and reports it to the recorder", async () => {
  const bus = createChangeBus();
  const recordError = vi.fn();
  const onError = vi.fn();
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
    metrics: {
      recordQuery: vi.fn(),
      recordError,
      recordCacheHit: vi.fn(),
      recordRefetch: vi.fn(),
      incrementListeners: vi.fn(),
      decrementListeners: vi.fn(),
    },
  });

  const { query, unmount } = mount(() =>
    useReactiveQuery(() => Promise.reject(new Error("no table")), {
      tables: ["sale_order"],
      queryKey: "sale:failing",
      isVisible: ALWAYS_VISIBLE,
      onError,
    }),
  );

  await flush();
  expect(query.error.value?.message).toBe("no table");
  expect(recordError).toHaveBeenCalledWith("sale:failing");
  expect(onError).toHaveBeenCalledTimes(1);
  unmount();
});

test("two call sites sharing a key await one query", async () => {
  const bus = createChangeBus();
  let resolveQuery!: (value: string) => void;
  const queryFn = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        resolveQuery = resolve;
      }),
  );
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const options = {
    tables: ["sale_order"],
    queryKey: "sale:shared",
    isVisible: ALWAYS_VISIBLE,
  };

  const first = mount(() => useReactiveQuery(queryFn, options));
  const second = mount(() => useReactiveQuery(queryFn, options));

  await flush();
  expect(queryFn).toHaveBeenCalledTimes(1);

  resolveQuery("shared");
  await flush();

  expect(first.query.data.value).toBe("shared");
  expect(second.query.data.value).toBe("shared");
  first.unmount();
  second.unmount();
});

test("a change while hidden refetches once the page becomes visible", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const isVisible = ref(false);
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on });

  const { unmount } = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: "sale:hidden",
      debounce: 5,
      isVisible,
    }),
  );

  await flush();
  expect(queryFn).toHaveBeenCalledTimes(1);

  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(1);

  isVisible.value = true;
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});

test("shouldRefetch can reject an event by its payload", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    useVisibility: () => ALWAYS_VISIBLE,
  });

  const { unmount } = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: "sale:payload",
      debounce: 5,
      isVisible: ALWAYS_VISIBLE,
      shouldRefetch: (event: TableChangeEvent) => event.affectedIds?.includes(7) ?? false,
    }),
  );

  await flush();

  bus.emit("sale_order", "update", { timestamp: Date.now(), affectedIds: [1] });
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(1);

  bus.emit("sale_order", "update", { timestamp: Date.now(), affectedIds: [7] });
  await afterDebounce(30);
  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});
