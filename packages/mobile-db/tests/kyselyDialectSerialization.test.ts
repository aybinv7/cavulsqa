import { expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { SharedConnectionSQLiteDialect } from "../src/kyselyDialect.js";

/**
 * Stands in for the shared connection the way a device behaves: a write that has to open
 * its own transaction fails while one is already open, and the driver's own bookkeeping
 * rolls back whatever transaction it finds. That is how a stray write silently discards
 * another transaction's committed rows, so the fake reproduces it rather than just
 * counting calls.
 */
function stubConnection() {
  const events: string[] = [];
  let transactionOpen = false;

  const database = {
    isTransactionActive: async () => ({ result: transactionOpen }),
    beginTransaction: async () => {
      if (transactionOpen) throw new Error("Already in transaction");
      transactionOpen = true;
      events.push("begin");
    },
    commitTransaction: async () => {
      if (!transactionOpen) throw new Error("no current transaction");
      transactionOpen = false;
      events.push("commit");
    },
    rollbackTransaction: async () => {
      transactionOpen = false;
      events.push("rollback");
    },
    run: async (sql: string, params: unknown[]) => {
      // The implicit-transaction path: open one, write, close it.
      if (transactionOpen) {
        transactionOpen = false;
        events.push("stray-write-rolled-back-someone-elses-transaction");
        throw new Error("Already in transaction");
      }
      transactionOpen = true;
      await Promise.resolve();
      events.push(`run:${label(params)}`);
      transactionOpen = false;
      return { changes: { changes: 1, lastId: 1, values: [] } };
    },
    query: async (sql: string, params: unknown[]) => {
      if (/^\s*SELECT changes\(\)/i.test(sql)) return { values: [{ changes: 1 }] };
      await Promise.resolve();
      events.push(`query:${label(params)}`);
      return { values: [] };
    },
  };

  function build(serializeAccess: boolean) {
    return new Kysely<any>({
      dialect: new SharedConnectionSQLiteDialect({
        database: database as never,
        sqlite: {
          saveToStore: async () => undefined,
          initWebStore: async () => undefined,
        } as never,
        name: "test",
        serializeAccess,
      }),
    });
  }

  return { build, events };
}

/** Kysely binds values as parameters, so the row name arrives there, not in the SQL. */
function label(params: unknown[]): string {
  return params.length ? String(params[0]) : "?";
}

test("without serializeAccess, concurrent writes collide on the shared connection", async () => {
  const { build } = stubConnection();
  const db = build(false);

  const results = await Promise.allSettled([
    db.insertInto("sale_order").values({ name: "a" }).execute(),
    db.insertInto("sale_order").values({ name: "b" }).execute(),
  ]);

  expect(results.some((result) => result.status === "rejected")).toBe(true);
});

test("serializeAccess runs concurrently issued writes one at a time", async () => {
  const { build, events } = stubConnection();
  const db = build(true);

  await Promise.all([
    db.insertInto("sale_order").values({ name: "a" }).execute(),
    db.insertInto("sale_order").values({ name: "b" }).execute(),
    db.insertInto("sale_order").values({ name: "c" }).execute(),
  ]);

  expect(events).toEqual(["run:a", "run:b", "run:c"]);
});

test("serializeAccess keeps a transaction whole while another write waits", async () => {
  const { build, events } = stubConnection();
  const db = build(true);

  await Promise.all([
    db.transaction().execute(async (trx) => {
      await trx.insertInto("sale_order").values({ name: "inside" }).execute();
    }),
    db.insertInto("sale_order").values({ name: "outside" }).execute(),
  ]);

  // The transaction holds the connection from begin to commit, so the standalone write
  // cannot land in the middle of it and roll it back.
  expect(events).toEqual(["begin", "query:inside", "commit", "run:outside"]);
  expect(events).not.toContain("stray-write-rolled-back-someone-elses-transaction");
});

/**
 * Reads are deliberately outside the lock: the native bridge pipelines concurrent calls,
 * so serializing them would cost several times the latency on any screen that loads with
 * `Promise.all`. This stub records starts and ends separately so overlap is visible.
 */
function readStub() {
  const events: string[] = [];

  const database = {
    isTransactionActive: async () => ({ result: false }),
    beginTransaction: async () => {
      events.push("begin");
    },
    commitTransaction: async () => {
      events.push("commit");
    },
    rollbackTransaction: async () => undefined,
    run: async (_sql: string, params: unknown[]) => {
      events.push(`write-start:${String(params[0])}`);
      await Promise.resolve();
      await Promise.resolve();
      events.push(`write-end:${String(params[0])}`);
      return { changes: { changes: 1, lastId: 1, values: [] } };
    },
    query: async (sql: string, params: unknown[]) => {
      if (/^\s*SELECT changes\(\)/i.test(sql)) return { values: [{ changes: 1 }] };
      const label = params.length ? String(params[0]) : "?";
      events.push(`read-start:${label}`);
      await Promise.resolve();
      await Promise.resolve();
      events.push(`read-end:${label}`);
      return { values: [] };
    },
  };

  const db = new Kysely<any>({
    dialect: new SharedConnectionSQLiteDialect({
      database: database as never,
      sqlite: { saveToStore: async () => undefined, initWebStore: async () => undefined } as never,
      name: "test",
      serializeAccess: true,
    }),
  });

  return { db, events };
}

test("serializeAccess leaves concurrent reads free to overlap", async () => {
  const { db, events } = readStub();

  await Promise.all([
    db.selectFrom("sale_order").select("name").where("name", "=", "a").execute(),
    db.selectFrom("sale_order").select("name").where("name", "=", "b").execute(),
  ]);

  // Both reads start before either finishes — that is the pipelining we want to keep.
  expect(events).toEqual(["read-start:a", "read-start:b", "read-end:a", "read-end:b"]);
});

test("serializeAccess still keeps concurrent writes apart", async () => {
  const { db, events } = readStub();

  await Promise.all([
    db.insertInto("sale_order").values({ name: "a" }).execute(),
    db.insertInto("sale_order").values({ name: "b" }).execute(),
  ]);

  expect(events).toEqual(["write-start:a", "write-end:a", "write-start:b", "write-end:b"]);
});

test("a read may run while a transaction is open, without waiting for it", async () => {
  const { db, events } = readStub();

  await Promise.all([
    db.transaction().execute(async (trx) => {
      await trx.insertInto("sale_order").values({ name: "tx" }).execute();
    }),
    db.selectFrom("sale_order").select("name").where("name", "=", "reader").execute(),
  ]);

  // The reader is not blocked behind the transaction's commit.
  expect(events.indexOf("read-start:reader")).toBeLessThan(events.indexOf("commit"));
});
