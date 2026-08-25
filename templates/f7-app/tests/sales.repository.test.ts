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
  deleteOrder,
  nextOrderReference,
  saveOrder,
  setOrderStatus,
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
    draft: 0,
    confirmed: 0,
    delivered: 0,
    revenueCents: 0,
    committedCents: 0,
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
    draft: 0,
    confirmed: 0,
    delivered: 0,
    revenueCents: 0,
    committedCents: 0,
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

test("committed revenue counts only confirmed and delivered orders", async () => {
  await seedSampleData(db, 2);
  const before = await loadDashboardStats(db);

  // Everything starts as a draft, so nothing is committed yet.
  expect(before.draft).toBe(4);
  expect(before.committedCents).toBe(0);
  expect(before.revenueCents).toBeGreaterThan(0);

  const [first] = await searchOrders(db, "");
  await setOrderStatus(db, first?.id ?? 0, "confirmed");

  const after = await loadDashboardStats(db);
  expect(after.draft).toBe(3);
  expect(after.confirmed).toBe(1);
  expect(after.committedCents).toBe(first?.totalCents ?? -1);
});

test("the next reference counts up and survives a deletion without reuse", async () => {
  expect(await nextOrderReference(db)).toBe("SO-0001");

  const customer = await db
    .insertInto("customer")
    .values({ created_at: "now", name: "Solo", city: "Oran" })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("product")
    .values({ created_at: "now", name: "Widget", price_cents: 500 })
    .execute();
  const product = await db.selectFrom("product").select("id").executeTakeFirstOrThrow();

  await saveOrder(db, {
    customerId: customer.id,
    reference: "SO-0001",
    lines: [{ productId: product.id, quantity: 2, unitPriceCents: 500 }],
  });
  expect(await nextOrderReference(db)).toBe("SO-0002");

  await saveOrder(db, {
    customerId: customer.id,
    reference: "SO-0002",
    lines: [{ productId: product.id, quantity: 1, unitPriceCents: 500 }],
  });

  // Removing the highest must not hand the same reference out twice.
  const orders = await searchOrders(db, "SO-0002");
  await deleteOrder(db, orders[0]?.id ?? 0);
  expect(await nextOrderReference(db)).toBe("SO-0002");
});

test("saving writes the order and all of its lines together", async () => {
  const customer = await db
    .insertInto("customer")
    .values({ created_at: "now", name: "Solo", city: "Oran" })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("product")
    .values({ created_at: "now", name: "Widget", price_cents: 250 })
    .execute();
  const product = await db.selectFrom("product").select("id").executeTakeFirstOrThrow();

  await saveOrder(db, {
    customerId: customer.id,
    reference: "SO-0007",
    lines: [
      { productId: product.id, quantity: 3, unitPriceCents: 250 },
      { productId: product.id, quantity: 1, unitPriceCents: 250 },
    ],
  });

  const [order] = await searchOrders(db, "SO-0007");
  expect(order?.lines).toBe(2);
  expect(order?.totalCents).toBe(1000);
  expect(order?.status).toBe("draft");
});

test("deleting an order takes its lines with it", async () => {
  await seedSampleData(db, 1);
  const [order] = await searchOrders(db, "");
  const id = order?.id ?? 0;

  await deleteOrder(db, id);

  expect((await searchOrders(db, "")).some((row) => row.id === id)).toBe(false);
  const orphans = await db
    .selectFrom("order_line")
    .select("id")
    .where("order_id", "=", id)
    .execute();
  expect(orphans).toEqual([]);
});
