import { expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { SharedConnectionSQLiteDialect } from "../src/kyselyDialect.js";

/**
 * Mimics @capacitor-community/sqlite closely enough to pin the contract that matters:
 * `run()` refuses to be called while a transaction is open, and `query()` never reports a
 * change count. Both are true on a real device and neither is true of sql.js, which is why
 * the sql.js-backed suites cannot catch a regression here.
 */
function stubConnection(opts: { inTransaction: boolean; changes: number }) {
  const calls: string[] = [];

  const database = {
    isTransactionActive: async () => ({ result: opts.inTransaction }),
    run: async (sql: string) => {
      calls.push(`run:${sql}`);
      if (opts.inTransaction) throw new Error("run() cannot be used inside a transaction");
      return { changes: { changes: opts.changes, lastId: 7, values: [] } };
    },
    query: async (sql: string) => {
      calls.push(`query:${sql}`);
      if (/^\s*SELECT changes\(\)/i.test(sql)) return { values: [{ changes: opts.changes }] };
      return { values: [] };
    },
  };

  const dialect = new SharedConnectionSQLiteDialect({
    database: database as never,
    sqlite: { saveToStore: async () => undefined, initWebStore: async () => undefined } as never,
    name: "test",
  });

  return { db: new Kysely<any>({ dialect }), calls };
}

test("reports affected rows for a write outside a transaction", async () => {
  const { db } = stubConnection({ inTransaction: false, changes: 1 });

  const result = await db
    .updateTable("sale_order")
    .set({ _sync_status: "to_create" })
    .where("id", "=", 1)
    .executeTakeFirst();

  expect(result.numUpdatedRows).toBe(1n);
});

test("reports affected rows for a write inside a transaction", async () => {
  const { db, calls } = stubConnection({ inTransaction: true, changes: 1 });

  const result = await db
    .updateTable("sale_order")
    .set({ _sync_status: "to_create" })
    .where("id", "=", 1)
    .executeTakeFirst();

  // The regression: query() carries no change count, so without asking SQLite for changes()
  // this came back undefined and every compare-and-set write read as "matched nothing".
  expect(result.numUpdatedRows).toBe(1n);
  expect(calls.some((c) => c.startsWith("run:"))).toBe(false);
  expect(calls.some((c) => /SELECT changes\(\)/i.test(c))).toBe(true);
});

test("distinguishes a compare-and-set that matched nothing, inside a transaction", async () => {
  const { db } = stubConnection({ inTransaction: true, changes: 0 });

  const result = await db
    .updateTable("sale_order")
    .set({ _sync_status: "to_create" })
    .where("_sync_status", "=", "draft")
    .executeTakeFirst();

  expect(result.numUpdatedRows).toBe(0n);
});
