import { beforeEach, expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { createSqlJsDialect } from "@cavulsqa/mobile-db/testing";
import {
  advanceOrderStatus,
  clearAll,
  createOrder,
  listCustomers,
  loadDashboardStats,
  searchOrders,
  seedSampleData,
} from "../src/domains/sales/sales.repository.js";
import { migrations } from "../src/shared/database/migrations.js";
import type { Database } from "../src/shared/database/schema.js";

/**
 * The queries run against real SQLite here - sql.js, the same dialect the packages use for their own
 * tests - so the joins, the aggregates and the migration are executed rather than just type-checked.
 * A schema this template ships broken would cost whoever generates from it an afternoon.
 */
let db: Kysely<Database>;

beforeEach(async () => {
  db = new Kysely<Database>({ dialect: await createSqlJsDialect() });
  await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  }).migrateToLatest();
});

test("the migration creates every table the schema declares", async () => {
  const tables = await db.introspection.getTables();
  const names = tables.map((table) => table.name).sort();

  expect(names).toContain("customer");
  expect(names).toContain("product");
  expect(names).toContain("sales_order");
  expect(names).toContain("order_line");
  expect(names).toContain("tag");
  expect(names).toContain("customer_tag");
});

test("an empty database reports zeroes rather than nulls", async () => {
  expect(await loadDashboardStats(db)).toEqual({
    customers: 0,
    products: 0,
    orders: 0,
    revenueCents: 0,
  });
});

test("seeding produces customers, products, orders and revenue", async () => {
  await seedSampleData(db, 4);
  const stats = await loadDashboardStats(db);

  expect(stats.customers).toBe(4);
  expect(stats.products).toBeGreaterThan(0);
  // Two orders per customer.
  expect(stats.orders).toBe(8);
  expect(stats.revenueCents).toBeGreaterThan(0);
});

test("the order list joins the customer and totals its lines", async () => {
  await seedSampleData(db, 2);
  const orders = await searchOrders(db, "");

  expect(orders.length).toBe(4);
  const first = orders[0];
  expect(first?.customerName).toMatch(/^Customer /);
  expect(first?.city.length).toBeGreaterThan(0);
  expect(first?.lines).toBeGreaterThan(0);
  expect(first?.totalCents).toBeGreaterThan(0);
});

test("search filters on the customer name and the reference together", async () => {
  await seedSampleData(db, 3);
  const all = await searchOrders(db, "");

  const byCustomer = await searchOrders(db, "Customer 2");
  expect(byCustomer.length).toBeGreaterThan(0);
  expect(byCustomer.every((order) => order.customerName === "Customer 2")).toBe(true);

  const reference = all[0]?.reference ?? "";
  const byReference = await searchOrders(db, reference);
  expect(byReference.some((order) => order.reference === reference)).toBe(true);

  expect(await searchOrders(db, "nothing-matches-this")).toEqual([]);
});

test("advancing a status cycles draft to confirmed to delivered and back", async () => {
  await seedSampleData(db, 1);
  const [order] = await searchOrders(db, "");
  const id = order?.id ?? 0;

  expect(order?.status).toBe("draft");

  await advanceOrderStatus(db, id);
  expect((await searchOrders(db, "")).find((row) => row.id === id)?.status).toBe("confirmed");

  await advanceOrderStatus(db, id);
  expect((await searchOrders(db, "")).find((row) => row.id === id)?.status).toBe("delivered");

  await advanceOrderStatus(db, id);
  expect((await searchOrders(db, "")).find((row) => row.id === id)?.status).toBe("draft");
});

test("advancing an order that does not exist is a no-op, not a throw", async () => {
  await expect(advanceOrderStatus(db, 9999)).resolves.toBeUndefined();
});

test("customers come back ordered by name", async () => {
  await seedSampleData(db, 3);
  const customers = await listCustomers(db);
  const names = customers.map((customer) => customer.name);

  expect(names).toEqual([...names].sort());
});

test("clearing leaves every table empty", async () => {
  await seedSampleData(db, 3);
  await clearAll(db);

  expect(await loadDashboardStats(db)).toEqual({
    customers: 0,
    products: 0,
    orders: 0,
    revenueCents: 0,
  });
  expect(await searchOrders(db, "")).toEqual([]);
});

test("an order's total is quantity times unit price, summed over its lines", async () => {
  await db
    .insertInto("customer")
    .values({ created_at: "now", name: "Solo", city: "Oran" })
    .execute();
  await db
    .insertInto("product")
    .values({ created_at: "now", name: "Widget", price_cents: 1000 })
    .execute();

  const customer = await db.selectFrom("customer").select("id").executeTakeFirstOrThrow();
  const product = await db
    .selectFrom("product")
    .select(["id", "price_cents"])
    .executeTakeFirstOrThrow();

  // Two lines, quantities 1 and 2 at 1000 each: 1000 + 2000.
  await createOrder(db, customer.id, [product, product]);

  const [order] = await searchOrders(db, "");
  expect(order?.lines).toBe(2);
  expect(order?.totalCents).toBe(3000);
});
