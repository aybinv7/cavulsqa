import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { createApp, defineComponent, h } from "vue";
import { createChangeBus } from "@cavulsqa/reactive-db";
import { createReactiveQuery, type ReactiveQueryLogger } from "../src/reactiveQuery.js";

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

function testLogger(): ReactiveQueryLogger & { calls: { level: string; message: string }[] } {
  const calls: { level: string; message: string }[] = [];
  return {
    calls,
    debug: (message: string) => calls.push({ level: "debug", message }),
    warn: (message: string) => calls.push({ level: "warn", message }),
    error: (message: string) => calls.push({ level: "error", message }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("a failure goes to the injected logger, not the console", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const logger = testLogger();
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on, logger });

  const unmount = mount(() =>
    useReactiveQuery(() => Promise.reject(new Error("no table")), {
      tables: ["sale_order"],
      queryKey: ["sale:logged"],
    }),
  );

  await vi.advanceTimersByTimeAsync(0);

  expect(logger.calls).toContainEqual({
    level: "error",
    message: "[useReactiveQuery] Query failed:",
  });
  expect(consoleError).not.toHaveBeenCalled();
  unmount();
  consoleError.mockRestore();
});

test("a key conflict is reported through the injected logger", async () => {
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const logger = testLogger();
  const bus = createChangeBus();
  const { useReactiveQuery } = createReactiveQuery({ onTableChange: bus.on, logger });

  const first = mount(() =>
    useReactiveQuery(() => Promise.resolve("a"), { tables: ["sale_order"], queryKey: ["dup"] }),
  );
  const second = mount(() =>
    useReactiveQuery(() => Promise.resolve("b"), { tables: ["partner"], queryKey: ["dup"] }),
  );

  await vi.advanceTimersByTimeAsync(0);

  expect(logger.calls.filter((call) => call.level === "warn")).toHaveLength(1);
  expect(consoleWarn).not.toHaveBeenCalled();
  first();
  second();
  consoleWarn.mockRestore();
});

test("retries run while the query is mounted", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.reject(new Error("locked")));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    logger: testLogger(),
  });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["sale:retrying"],
      retry: 2,
      retryDelay: 1000,
    }),
  );

  await vi.advanceTimersByTimeAsync(0);
  expect(queryFn).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1000);
  expect(queryFn).toHaveBeenCalledTimes(2);

  await vi.advanceTimersByTimeAsync(1000);
  expect(queryFn).toHaveBeenCalledTimes(3);
  unmount();
});

test("unmounting during the backoff abandons the retry", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.reject(new Error("locked")));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    logger: testLogger(),
  });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["sale:abandoned"],
      retry: 3,
      retryDelay: 1000,
    }),
  );

  await vi.advanceTimersByTimeAsync(0);
  expect(queryFn).toHaveBeenCalledTimes(1);

  // Mid-backoff: the first attempt has failed and the second is waiting.
  await vi.advanceTimersByTimeAsync(400);
  unmount();

  await vi.advanceTimersByTimeAsync(5000);
  expect(queryFn).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test("cacheTime suppresses a refetch inside the window and allows it after", async () => {
  const bus = createChangeBus();
  const queryFn = vi.fn(() => Promise.resolve("row"));
  const { useReactiveQuery } = createReactiveQuery({
    onTableChange: bus.on,
    logger: testLogger(),
  });

  const unmount = mount(() =>
    useReactiveQuery(queryFn, {
      tables: ["sale_order"],
      queryKey: ["sale:cached"],
      debounce: 5,
      cacheTime: 10_000,
    }),
  );

  await vi.advanceTimersByTimeAsync(0);
  expect(queryFn).toHaveBeenCalledTimes(1);

  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await vi.advanceTimersByTimeAsync(100);
  expect(queryFn).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(10_000);
  bus.emit("sale_order", "insert", { timestamp: Date.now() });
  await vi.advanceTimersByTimeAsync(100);
  expect(queryFn).toHaveBeenCalledTimes(2);
  unmount();
});
