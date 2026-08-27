import { expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { SharedConnectionSQLiteDialect } from "../src/capacitor/dialect.js";

/**
 * Overlap is forced with explicit gates rather than by counting microtasks. An earlier version of
 * these stubs held the connection across two `await Promise.resolve()` and relied on two queries
 * interleaving inside that window; kysely 0.29 added an await to the query path, the window closed,
 * and the tests passed while testing nothing. A gate the test opens by hand does not care how many
 * ticks kysely takes internally.
 */
function gate() {
  let open!: () => void;
  const held = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { held, open };
}

/** Yields until `predicate` holds, so a test can wait for "both started" without counting ticks. */
async function waitFor(predicate: () => boolean, description: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`timed out waiting for ${description}`);
}

/** Kysely binds values as parameters, so the row name arrives there, not in the SQL. */
function label(params: unknown[]): string {
  return params.length ? String(params[0]) : "?";
}

/**
 * Stands in for the shared connection the way a device behaves: a write that has to open
 * its own transaction fails while one is already open, and the driver's own bookkeeping
 * rolls back whatever transaction it finds. That is how a stray write silently discards
 * another transaction's committed rows, so the fake reproduces it rather than just
 * counting calls.
 */
function stubConnection() {
  const events: string[] = [];
  const gates = new Map<string, Promise<void>>();
  let transactionOpen = false;

  /** Make the named statement block inside the connection until the returned function is called. */
  function hold(name: string): () => void {
    const { held, open } = gate();
    gates.set(name, held);
    return open;
  }

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
    run: async (_sql: string, params: unknown[]) => {
      const name = label(params);
      // The implicit-transaction path: open one, write, close it.
      if (transactionOpen) {
        transactionOpen = false;
        events.push("stray-write-rolled-back-someone-elses-transaction");
        throw new Error("Already in transaction");
      }
      transactionOpen = true;
      events.push(`run-start:${name}`);
      await (gates.get(name) ?? Promise.resolve());
      events.push(`run:${name}`);
      transactionOpen = false;
      return { changes: { changes: 1, lastId: 1, values: [] } };
    },
    query: async (sql: string, params: unknown[]) => {
      if (/^\s*SELECT changes\(\)/i.test(sql)) return { values: [{ changes: 1 }] };
      const name = label(params);
      events.push(`query-start:${name}`);
      await (gates.get(name) ?? Promise.resolve());
      events.push(`query:${name}`);
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

  return { build, events, hold };
}

test("without serializeAccess, a second write lands inside the first one's transaction", async () => {
  const { build, events, hold } = stubConnection();
  const db = build(false);
  const releaseA = hold("a");

  const first = db.insertInto("sale_order").values({ name: "a" }).execute();
  await waitFor(() => events.includes("run-start:a"), "the first write to reach the connection");

  // Nothing serialises access, so this one reaches the connection while "a" holds it. The
  // connection sees a transaction already open and runs the statement inside it rather than
  // opening its own - so the write is not isolated, and a rollback of "a" would take it too.
  //
  // Under kysely 0.28 the same race surfaced as an outright rejection, because the second write
  // observed no transaction yet and tried to open one. 0.29 added an await to the query path, so
  // it now observes the open transaction and joins it silently. Quieter, and worse.
  await db.insertInto("sale_order").values({ name: "b" }).execute();

  const strayStart = events.indexOf("query-start:b");
  const holderStart = events.indexOf("run-start:a");
  const holderEnd = events.indexOf("run:a");

  expect(holderEnd).toBe(-1);
  expect(strayStart).toBeGreaterThan(holderStart);

  releaseA();
  await first;
  expect(events.indexOf("query:b")).toBeLessThan(events.indexOf("run:a"));
});

test("serializeAccess runs concurrently issued writes one at a time", async () => {
  const { build, events } = stubConnection();
  const db = build(true);

  await Promise.all([
    db.insertInto("sale_order").values({ name: "a" }).execute(),
    db.insertInto("sale_order").values({ name: "b" }).execute(),
    db.insertInto("sale_order").values({ name: "c" }).execute(),
  ]);

  expect(events.filter((event) => event.startsWith("run:"))).toEqual(["run:a", "run:b", "run:c"]);
  expect(events).not.toContain("stray-write-rolled-back-someone-elses-transaction");
});

test("serializeAccess holds the connection for a whole write, not just its start", async () => {
  const { build, events, hold } = stubConnection();
  const db = build(true);
  const releaseA = hold("a");

  const first = db.insertInto("sale_order").values({ name: "a" }).execute();
  await waitFor(() => events.includes("run-start:a"), "the first write to reach the connection");

  const second = db.insertInto("sale_order").values({ name: "b" }).execute();
  // "b" must not even reach the connection while "a" is mid-flight.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(events).not.toContain("run-start:b");

  releaseA();
  await Promise.all([first, second]);
  expect(events.filter((event) => event.startsWith("run:"))).toEqual(["run:a", "run:b"]);
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
  expect(events.filter((event) => !event.includes("-start:"))).toEqual([
    "begin",
    "query:inside",
    "commit",
    "run:outside",
  ]);
  expect(events).not.toContain("stray-write-rolled-back-someone-elses-transaction");
});

/**
 * Reads are deliberately outside the lock: the native bridge pipelines concurrent calls,
 * so serializing them would cost several times the latency on any screen that loads with
 * `Promise.all`.
 */
test("serializeAccess leaves concurrent reads free to overlap", async () => {
  const { build, events, hold } = stubConnection();
  const db = build(true);
  const releaseA = hold("a");
  const releaseB = hold("b");

  const reads = Promise.all([
    db.selectFrom("sale_order").select("name").where("name", "=", "a").execute(),
    db.selectFrom("sale_order").select("name").where("name", "=", "b").execute(),
  ]);

  // Both reads are inside the connection at once — that is the pipelining we want to keep.
  await waitFor(
    () => events.includes("query-start:a") && events.includes("query-start:b"),
    "both reads to start before either finishes",
  );
  expect(events).not.toContain("query:a");

  releaseA();
  releaseB();
  await reads;
});

test("a read may run while a transaction is open, without waiting for it", async () => {
  const { build, events, hold } = stubConnection();
  const db = build(true);
  const releaseInside = hold("inside");

  const transaction = db.transaction().execute(async (trx) => {
    await trx.insertInto("sale_order").values({ name: "inside" }).execute();
  });
  await waitFor(() => events.includes("query-start:inside"), "the transaction to be underway");

  const read = db.selectFrom("sale_order").select("name").where("name", "=", "reader").execute();
  await waitFor(() => events.includes("query-start:reader"), "the reader to reach the connection");

  // The reader got in before the transaction committed.
  expect(events).not.toContain("commit");

  releaseInside();
  await Promise.all([transaction, read]);
  expect(events).toContain("commit");
});
