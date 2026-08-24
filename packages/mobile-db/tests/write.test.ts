import { test, expect } from "vite-plus/test";
import { runWrite, type WriteContext } from "../src/write.js";

test("runs the work inside a transaction and returns its result", async () => {
  const result = await runWrite({ operation: "x", tables: [] }, async () => 42, {
    runInTransaction: (work: () => Promise<any>) => work(),
    emitTableChange: () => {},
  });
  expect(result).toBe(42);
});

test("emits one change event per table, only after the work commits", async () => {
  const order: string[] = [];
  await runWrite(
    { operation: "sale.add_line", tables: ["sale_order", "sale_order_line"] },
    async () => {
      order.push("work");
    },
    {
      runInTransaction: async (work: () => Promise<any>) => {
        const r = await work();
        order.push("committed");
        return r;
      },
      emitTableChange: (t: string) => order.push(`emit:${t}`),
    },
  );
  expect(order).toEqual(["work", "committed", "emit:sale_order", "emit:sale_order_line"]);
});

test("reports telemetry success after a successful write", async () => {
  const successes: string[] = [];
  await runWrite({ operation: "stock.count", tables: [] }, async () => {}, {
    runInTransaction: (work: () => Promise<any>) => work(),
    emitTableChange: () => {},
    telemetry: { success: (ctx: WriteContext) => successes.push(ctx.operation) },
  });
  expect(successes).toEqual(["stock.count"]);
});

test("on failure it emits nothing, reports telemetry failure, and rethrows", async () => {
  const emitted: string[] = [];
  const failures: unknown[] = [];
  const boom = new Error("boom");
  await expect(
    runWrite(
      { operation: "x", tables: ["sale_order"] },
      async () => {
        throw boom;
      },
      {
        runInTransaction: (work: () => Promise<any>) => work(),
        emitTableChange: (t: string) => emitted.push(t),
        telemetry: { failure: (_ctx: WriteContext, error: unknown) => failures.push(error) },
      },
    ),
  ).rejects.toBe(boom);
  expect(emitted).toEqual([]);
  expect(failures).toEqual([boom]);
});
