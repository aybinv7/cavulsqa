import { expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { createSqlJsDialect } from "@cavulsqa/mobile-db/testing";
import { runBenchmark } from "../src/domains/benchmark/benchmark.suite.js";
import { migrations } from "../src/shared/database/migrations.js";
import type { Database } from "../src/shared/database/schema.js";

/**
 * The suite runs 17 cases including transactions, a rollback and an upsert. A broken case would only
 * surface on a phone, halfway through a run, as a number nobody could interpret - so it executes
 * here against real SQLite instead.
 */
test("every benchmark case runs and reports a timing", async () => {
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  }).migrateToLatest();

  const seen: string[] = [];
  const result = await runBenchmark(db, (name) => seen.push(name));

  expect(result.cases.length).toBeGreaterThanOrEqual(16);
  expect(seen.length).toBe(result.cases.length);
  expect(result.rowsSeeded).toBeGreaterThan(1000);

  for (const entry of result.cases) {
    expect(entry.operations, entry.name).toBeGreaterThan(0);
    expect(entry.msPerOperation, entry.name).toBeGreaterThanOrEqual(0);
    expect(entry.worstMs, entry.name).toBeGreaterThanOrEqual(entry.medianMs);
  }

  // All four groups have to be represented, or the suite is not covering what it claims to.
  expect([...new Set(result.cases.map((entry) => entry.group))].sort()).toEqual([
    "concurrency",
    "read",
    "transaction",
    "write",
  ]);

  // The benchmark cleans up after itself: the app's own screens must not see its rows.
  const left = await db
    .selectFrom("bench_parent")
    .select(({ fn }) => fn.countAll<number>().as("n"))
    .executeTakeFirstOrThrow();
  expect(Number(left.n)).toBe(0);
});

test("the benchmark never touches the app's tables", async () => {
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  }).migrateToLatest();

  await db
    .insertInto("customer")
    .values({ created_at: "2026-01-01T00:00:00.000Z", name: "Untouched", city: "Algiers" })
    .execute();

  await runBenchmark(db);

  const customers = await db.selectFrom("customer").select("name").execute();
  expect(customers.map((row) => row.name)).toEqual(["Untouched"]);
});
