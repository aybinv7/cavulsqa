import { expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { createSqlJsDialect } from "@cavulsqa/mobile-db/testing";
import { migrations } from "../src/shared/database/migrations.js";
import type { Database } from "../src/shared/database/schema.js";

async function migrate(db: Kysely<Database>, set = migrations) {
  return new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(set) },
  }).migrateToLatest();
}

test("a fresh database gets every table the schema declares", async () => {
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  const result = await migrate(db);
  expect(result.error).toBeUndefined();

  const names = (await db.introspection.getTables()).map((t) => t.name);
  for (const table of [
    "customer",
    "product",
    "sales_order",
    "order_line",
    "tag",
    "customer_tag",
    "bench_region",
    "bench_city",
    "bench_customer",
    "bench_category",
    "bench_product",
    "bench_warehouse",
    "bench_stock",
    "bench_order",
    "bench_order_line",
    "bench_payment",
  ]) {
    expect(names, table).toContain(table);
  }

  // The two-table benchmark 003 replaced must be gone, not merely unused.
  expect(names).not.toContain("bench_parent");
  expect(names).not.toContain("bench_child");
});

/**
 * The failure this exists for: deleting an already-applied migration instead of emptying it. Kysely
 * records applied migrations by key, so a recorded key the provider no longer offers makes it refuse
 * the entire set - applying nothing, reporting the error in its return value rather than throwing,
 * and leaving an app whose first query fails with "no such table".
 */
test("dropping an applied migration is refused, and the refusal is visible", async () => {
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  expect((await migrate(db)).error).toBeUndefined();

  const { "002_benchmark": _removed, ...withoutTombstone } = migrations;
  const result = await migrate(db, withoutTombstone);

  expect(result.error, "kysely must object to the missing migration").toBeDefined();
});

test("running twice is a no-op, and every key is still there", async () => {
  const db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  const first = await migrate(db);
  const second = await migrate(db);

  expect(first.error).toBeUndefined();
  expect(second.error).toBeUndefined();
  expect(second.results ?? []).toEqual([]);

  // The tombstone counts: a key may stop doing work but may not stop existing.
  expect(Object.keys(migrations)).toEqual(["001_sales", "002_benchmark", "003_benchmark_scale"]);
});
