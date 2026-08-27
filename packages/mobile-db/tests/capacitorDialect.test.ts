import { expect, test } from "vite-plus/test";
import { Kysely, type Generated } from "kysely";
import { SharedConnectionSQLiteDialect } from "../src/capacitor/dialect.js";

interface TestDB {
  sale_order: { id: Generated<number>; _sync_status: Generated<string>; reference: string };
  archive: { id: number };
  customer: { id: Generated<number> };
}

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
      if (/^\s*SELECT changes\(\)/i.test(sql)) {
        return { values: [{ changes: opts.changes, insert_id: 7 }] };
      }
      // The plugin executes a statement handed to query() but hands back none of its RETURNING
      // rows. That is the whole reason the dialect has to ask for the id separately.
      return { values: [] };
    },
  };

  const dialect = new SharedConnectionSQLiteDialect({
    database: database as never,
    sqlite: { saveToStore: async () => undefined, initWebStore: async () => undefined } as never,
    name: "test",
  });

  return { db: new Kysely<TestDB>({ dialect }), calls };
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

test("reports the inserted id for an insert inside a transaction", async () => {
  const { db, calls } = stubConnection({ inTransaction: true, changes: 1 });

  const result = await db
    .insertInto("sale_order")
    .values({ reference: "SO-0001" })
    .executeTakeFirstOrThrow();

  expect(result.insertId).toBe(7n);
  expect(calls.some((c) => /last_insert_rowid\(\)/i.test(c))).toBe(true);
});

test("does not report an inserted id for an update inside a transaction", async () => {
  const { db } = stubConnection({ inTransaction: true, changes: 1 });

  const result = await db
    .updateTable("sale_order")
    .set({ reference: "SO-0002" })
    .where("id", "=", 1)
    .executeTakeFirst();

  // last_insert_rowid() still holds whatever the last insert on this connection set; reporting it
  // on an update would name a row this statement never touched.
  expect(result.numUpdatedRows).toBe(1n);
});

test("says what happened when RETURNING is dropped inside a transaction", async () => {
  const { db } = stubConnection({ inTransaction: true, changes: 1 });

  // Before this, the insert succeeded and kysely threw "no result" - a message that sends you
  // looking for a failed write that never failed.
  await expect(
    db
      .insertInto("sale_order")
      .values({ reference: "SO-0003" })
      .returning("id")
      .executeTakeFirstOrThrow(),
  ).rejects.toThrow(/insertId/);
});

test("an INSERT that contains a SELECT is executed as a write", async () => {
  const { db, calls } = stubConnection({ inTransaction: false, changes: 3 });

  await db
    .insertInto("archive")
    .columns(["id"])
    .expression((eb) => eb.selectFrom("customer").select("id"))
    .execute();

  // Routing on `sql.includes("select")` sent this down the read path: `query()` ran it, so the
  // rows really were inserted, but the dialect reported no change count and the caller saw a
  // write that had apparently done nothing. The decision comes off the compiled tree now.
  expect(calls.some((call) => call.startsWith("run:"))).toBe(true);
  expect(calls.some((call) => call.startsWith("query:insert"))).toBe(false);
});

test("a CTE that ends in a mutation is executed as a write", async () => {
  const { db, calls } = stubConnection({ inTransaction: false, changes: 1 });

  await db
    .with("stale", (qb) => qb.selectFrom("sale_order").select("id"))
    .deleteFrom("sale_order")
    .where("id", "in", (eb) => eb.selectFrom("stale").select("id"))
    .execute();

  expect(calls.some((call) => call.startsWith("run:"))).toBe(true);
});
