import { expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { createSqlJsDialect } from "@cavulsqa/mobile-db/testing";
import { runBenchmark } from "../src/domains/benchmark/benchmark.suite.js";
import { datasetRowCount, SCALE, TOTAL_ROWS } from "../src/domains/benchmark/benchmark.dataset.js";
import { migrations } from "../src/shared/database/migrations.js";
import type { Database } from "../src/shared/database/schema.js";

async function open(): Promise<Kysely<Database>> {
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  }).migrateToLatest();
  return db;
}

/**
 * The suite seeds roughly 100k rows across ten tables and runs 24 cases, several of them six-table
 * joins. A broken case would otherwise surface halfway through a run on a phone, as a number nobody
 * could interpret - so it executes here against real SQLite first.
 *
 * Slow by design: this is the only place the whole thing runs without a device.
 */
test("the whole suite runs at scale and every case reports a timing", async () => {
  const db = await open();

  const seen: string[] = [];
  const result = await runBenchmark(db, (name) => seen.push(name));

  expect(result.cases.length).toBeGreaterThanOrEqual(27);
  expect(result.seedMs, "the first run builds the dataset").toBeGreaterThan(0);
  expect(result.rowsSeeded).toBeGreaterThanOrEqual(SCALE.orderLines + SCALE.stock);

  for (const entry of result.cases) {
    expect(entry.operations, entry.name).toBeGreaterThan(0);
    expect(entry.msPerOperation, entry.name).toBeGreaterThanOrEqual(0);
    expect(entry.worstMs, entry.name).toBeGreaterThanOrEqual(entry.medianMs);
  }

  // All six groups represented, or the suite is not covering what it claims to.
  expect([...new Set(result.cases.map((entry) => entry.group))].sort()).toEqual([
    "concurrency",
    "join",
    "read",
    "schema",
    "sync",
    "transaction",
    "write",
  ]);

  /**
   * The sync cases measure how long a read waits, so a zero would mean the read never queued behind
   * the write and the case proved nothing.
   */
  for (const entry of result.cases.filter((c) => c.group === "sync")) {
    expect(entry.medianMs, entry.name).toBeGreaterThan(0);
  }

  // Read and join cases must actually return rows; a fast case that returns none proves nothing.
  for (const entry of result.cases.filter((c) => c.group === "join")) {
    expect(entry.rows, `${entry.name} returned no rows`).toBeGreaterThan(0);
  }
}, 600_000);

/**
 * The dataset has to survive a run untouched, or every subsequent run measures a different database
 * and two runs cannot be compared.
 */
test("a run leaves the dataset exactly as it found it", async () => {
  const db = await open();
  await runBenchmark(db);
  const after = await datasetRowCount(db);

  await runBenchmark(db);
  expect(await datasetRowCount(db)).toBe(after);

  // And nothing the write cases created is left behind.
  const strays = await db
    .selectFrom("bench_payment")
    .select(({ fn }) => fn.countAll<number>().as("n"))
    .where("method", "like", "bench-%")
    .executeTakeFirstOrThrow();
  expect(Number(strays.n)).toBe(0);
}, 600_000);

test("the scale constants add up to about 100k rows", () => {
  expect(TOTAL_ROWS).toBeGreaterThan(100_000);
  expect(SCALE.orderLines).toBe(40_000);
});

test("the benchmark never touches the app's tables", async () => {
  const db = await open();
  await db
    .insertInto("customer")
    .values({ created_at: "2026-01-01T00:00:00.000Z", name: "Untouched", city: "Algiers" })
    .execute();

  await runBenchmark(db);

  const customers = await db.selectFrom("customer").select("name").execute();
  expect(customers.map((row) => row.name)).toEqual(["Untouched"]);
}, 600_000);
