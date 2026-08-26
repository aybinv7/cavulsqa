import { sql, type Kysely } from "kysely";
import { nowISO } from "@cavulsqa/mobile-db/core";
import type { Database } from "@/shared/database/schema";

export interface DashboardStats {
  customers: number;
  products: number;
  orders: number;
  draft: number;
  confirmed: number;
  delivered: number;
  revenueCents: number;
  /** Only confirmed and delivered orders count as money you will actually see. */
  committedCents: number;
}

export interface OrderRow {
  id: number;
  reference: string;
  status: string;
  createdAt: string;
  customerName: string;
  city: string;
  lines: number;
  totalCents: number;
}

const CITIES = ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Sétif"];
const TAGS = ["wholesale", "retail", "priority", "new"];
const PRODUCTS: Array<[string, number]> = [
  ["Espresso 1kg", 189000],
  ["Green tea 500g", 74000],
  ["Ceramic mug", 32000],
  ["Filter papers", 9500],
  ["Cold brew bottle", 45000],
];

/** Reads go straight to the database; only writes need the reactive wrapper. */
export function loadDashboardStats(db: Kysely<Database>): Promise<DashboardStats> {
  return db
    .selectNoFrom((eb) => [
      eb
        .selectFrom("customer")
        .select((e) => e.fn.countAll<number>().as("n"))
        .as("customers"),
      eb
        .selectFrom("product")
        .select((e) => e.fn.countAll<number>().as("n"))
        .as("products"),
      eb
        .selectFrom("sales_order")
        .select((e) => e.fn.countAll<number>().as("n"))
        .as("orders"),
      eb
        .selectFrom("order_line")
        .select(sql<number>`coalesce(sum(quantity * unit_price_cents), 0)`.as("n"))
        .as("revenue"),
      eb
        .selectFrom("sales_order")
        .select((e) => e.fn.countAll<number>().as("n"))
        .where("status", "=", "draft")
        .as("draft"),
      eb
        .selectFrom("sales_order")
        .select((e) => e.fn.countAll<number>().as("n"))
        .where("status", "=", "confirmed")
        .as("confirmed"),
      eb
        .selectFrom("sales_order")
        .select((e) => e.fn.countAll<number>().as("n"))
        .where("status", "=", "delivered")
        .as("delivered"),
      eb
        .selectFrom("order_line")
        .innerJoin("sales_order", "sales_order.id", "order_line.order_id")
        .select(
          sql<number>`coalesce(sum(order_line.quantity * order_line.unit_price_cents), 0)`.as("n"),
        )
        .where("sales_order.status", "in", ["confirmed", "delivered"])
        .as("committed"),
    ])
    .executeTakeFirstOrThrow()
    .then((row) => ({
      customers: Number(row.customers ?? 0),
      products: Number(row.products ?? 0),
      orders: Number(row.orders ?? 0),
      draft: Number(row.draft ?? 0),
      confirmed: Number(row.confirmed ?? 0),
      delivered: Number(row.delivered ?? 0),
      revenueCents: Number(row.revenue ?? 0),
      committedCents: Number(row.committed ?? 0),
    }));
}

/**
 * The join is the point: this reads four tables, so a write to any of them has to refresh it. The
 * search term filters on the customer and the reference together.
 */
export function searchOrders(db: Kysely<Database>, term: string): Promise<OrderRow[]> {
  const like = `%${term.trim()}%`;

  let query = db
    .selectFrom("sales_order")
    .innerJoin("customer", "customer.id", "sales_order.customer_id")
    .leftJoin("order_line", "order_line.order_id", "sales_order.id")
    .select(({ fn }) => [
      "sales_order.id as id",
      "sales_order.reference as reference",
      "sales_order.status as status",
      "sales_order.created_at as createdAt",
      "customer.name as customerName",
      "customer.city as city",
      fn.count<number>("order_line.id").as("lines"),
      sql<number>`coalesce(sum(order_line.quantity * order_line.unit_price_cents), 0)`.as(
        "totalCents",
      ),
    ])
    .groupBy(["sales_order.id", "customer.name", "customer.city"])
    .orderBy("sales_order.id", "desc")
    .limit(40);

  if (term.trim()) {
    query = query.where((eb) =>
      eb.or([eb("customer.name", "like", like), eb("sales_order.reference", "like", like)]),
    );
  }

  return query.execute().then((rows) =>
    rows.map((row) => ({
      ...row,
      lines: Number(row.lines),
      totalCents: Number(row.totalCents),
    })),
  );
}

export function listCustomers(
  db: Kysely<Database>,
): Promise<Array<{ id: number; name: string; city: string }>> {
  return db.selectFrom("customer").select(["id", "name", "city"]).orderBy("name").execute();
}

const REFERENCE_CUSTOMERS = 6;

/**
 * The catalogue and a few customers - what the app needs before anyone can write an order at all.
 * Run at startup, because a first launch that makes you press "seed" before the New order sheet has
 * anything to pick is not a first launch anyone should have.
 *
 * Idempotent by table rather than by row: these are fixtures, so if they are there this has run.
 */
export async function ensureReferenceData(db: Kysely<Database>): Promise<void> {
  const at = nowISO();

  const existing = await db.selectFrom("product").select("name").execute();
  const known = new Set(existing.map((product) => product.name));

  for (const [name, price] of PRODUCTS) {
    if (known.has(name)) continue;
    await db.insertInto("product").values({ created_at: at, name, price_cents: price }).execute();
  }

  // `tag.label` is unique, and a plain insert threw "UNIQUE constraint failed" on the second run.
  for (const label of TAGS) {
    await db
      .insertInto("tag")
      .values({ label })
      .onConflict((oc) => oc.column("label").doNothing())
      .execute();
  }

  const customers = await db.selectFrom("customer").select("id").execute();
  if (customers.length) return;

  const tags = await db.selectFrom("tag").select("id").execute();

  for (let index = 0; index < REFERENCE_CUSTOMERS; index++) {
    const customerId = await insertCustomer(db, at);
    const tag = tags[index % tags.length];
    if (tag) {
      await db
        .insertInto("customer_tag")
        .values({ customer_id: customerId, tag_id: tag.id })
        .execute();
    }
  }
}

/**
 * The name is numbered from how many customers exist right now, so it stays unique across seeds -
 * counted per insert rather than once per batch, because adding a loop index to a count that the
 * loop is itself growing produces collisions.
 *
 * `insertId` rather than `.returning("id")` for the same reason as `saveOrder`: it is the one way
 * that works on both sides of a transaction boundary.
 */
async function insertCustomer(db: Kysely<Database>, at: string): Promise<number> {
  const existing = (await db.selectFrom("customer").select("id").execute()).length;

  const inserted = await db
    .insertInto("customer")
    .values({
      created_at: at,
      name: `Customer ${String(existing + 1)}`,
      city: CITIES[existing % CITIES.length] ?? "Algiers",
    })
    .executeTakeFirstOrThrow();

  const id = Number(inserted.insertId ?? 0);
  if (!id) throw new Error("the customer was written but the database reported no id for it");
  return id;
}

/**
 * Demo orders on top of the reference data. Every write goes through `rdb`, so each announces the
 * tables it touched.
 *
 * This is a button people press more than once, so it adds to the data rather than assuming an
 * empty database.
 */
export async function seedSampleData(db: Kysely<Database>, customers = 3): Promise<void> {
  await ensureReferenceData(db);

  const at = nowISO();
  const products = await db.selectFrom("product").select(["id", "price_cents"]).execute();
  const tags = await db.selectFrom("tag").select("id").execute();

  for (let index = 0; index < customers; index++) {
    const customerId = await insertCustomer(db, at);

    const tag = tags[index % tags.length];
    if (tag) {
      await db
        .insertInto("customer_tag")
        .values({ customer_id: customerId, tag_id: tag.id })
        .execute();
    }

    for (let orderIndex = 0; orderIndex < 2; orderIndex++) {
      await createOrder(db, customerId, products.slice(0, 2 + ((index + orderIndex) % 3)));
    }
  }
}

export async function createOrder(
  db: Kysely<Database>,
  customerId: number,
  lines: Array<{ id: number; price_cents: number }>,
): Promise<void> {
  const at = nowISO();
  const reference = `SO-${String(Date.now() % 1000000).padStart(6, "0")}`;

  const inserted = await db
    .insertInto("sales_order")
    .values({ created_at: at, customer_id: customerId, reference, status: "draft" })
    .executeTakeFirstOrThrow();

  const orderId = Number(inserted.insertId ?? 0);
  if (!orderId) throw new Error("the order was written but the database reported no id for it");

  for (const [index, line] of lines.entries()) {
    await db
      .insertInto("order_line")
      .values({
        order_id: orderId,
        product_id: line.id,
        quantity: index + 1,
        unit_price_cents: line.price_cents,
      })
      .execute();
  }
}

export async function advanceOrderStatus(db: Kysely<Database>, orderId: number): Promise<void> {
  const next = { draft: "confirmed", confirmed: "delivered", delivered: "draft" } as const;
  const current = await db
    .selectFrom("sales_order")
    .select("status")
    .where("id", "=", orderId)
    .executeTakeFirst();
  if (!current) return;

  await db
    .updateTable("sales_order")
    .set({ status: next[current.status] })
    .where("id", "=", orderId)
    .execute();
}

/** Order lines go with the order through the cascade, so only the parents are deleted here. */
export async function clearAll(db: Kysely<Database>): Promise<void> {
  await db.deleteFrom("customer").execute();
  await db.deleteFrom("sales_order").execute();
  await db.deleteFrom("order_line").execute();
  await db.deleteFrom("customer_tag").execute();
  await db.deleteFrom("product").execute();
  await db.deleteFrom("tag").execute();
}

export interface ProductRow {
  id: number;
  name: string;
  price_cents: number;
}

export function listProducts(db: Kysely<Database>): Promise<ProductRow[]> {
  return db.selectFrom("product").select(["id", "name", "price_cents"]).orderBy("name").execute();
}

/**
 * Sequential rather than random, because a reference a person reads should count up. Derived from
 * the highest existing number so it survives deletions without reusing a reference.
 */
export async function nextOrderReference(db: Kysely<Database>): Promise<string> {
  const row = await db
    .selectFrom("sales_order")
    .select(sql<number>`coalesce(max(cast(substr(reference, 4) as integer)), 0)`.as("highest"))
    .executeTakeFirst();

  return `SO-${String(Number(row?.highest ?? 0) + 1).padStart(4, "0")}`;
}

export interface DraftLine {
  productId: number;
  quantity: number;
  unitPriceCents: number;
}

/** The whole order in one transaction: a half-written order is worse than no order. */
export async function saveOrder(
  db: Kysely<Database>,
  input: { customerId: number; reference: string; lines: DraftLine[] },
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    /**
     * `insertId`, not `.returning("id")`: the SQLite plugin runs a statement issued inside an open
     * transaction through `query()`, which executes it but drops its RETURNING rows - so the insert
     * succeeded and kysely still threw "no result". `insertId` comes from `last_insert_rowid()`.
     */
    const inserted = await trx
      .insertInto("sales_order")
      .values({
        created_at: nowISO(),
        customer_id: input.customerId,
        reference: input.reference,
        status: "draft",
      })
      .executeTakeFirstOrThrow();

    const orderId = Number(inserted.insertId ?? 0);
    if (!orderId) throw new Error("the order was written but the database reported no id for it");

    for (const line of input.lines) {
      await trx
        .insertInto("order_line")
        .values({
          order_id: orderId,
          product_id: line.productId,
          quantity: line.quantity,
          unit_price_cents: line.unitPriceCents,
        })
        .execute();
    }
  });
}

export async function deleteOrder(db: Kysely<Database>, orderId: number): Promise<void> {
  // The cascade only fires with foreign keys on, which the plugin does not guarantee per connection.
  await db.deleteFrom("order_line").where("order_id", "=", orderId).execute();
  await db.deleteFrom("sales_order").where("id", "=", orderId).execute();
}

export async function setOrderStatus(
  db: Kysely<Database>,
  orderId: number,
  status: "draft" | "confirmed" | "delivered",
): Promise<void> {
  await db.updateTable("sales_order").set({ status }).where("id", "=", orderId).execute();
}

export interface OrderLineRow {
  id: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderDetail {
  id: number;
  reference: string;
  status: "draft" | "confirmed" | "delivered";
  createdAt: string;
  customerName: string;
  city: string;
  tags: string[];
  lines: OrderLineRow[];
  totalCents: number;
}

/**
 * The detail read touches five of the six tables - order, customer, line, product and the tag
 * junction - which is what makes it a fair demonstration: any write in that set refreshes it.
 */
export async function loadOrderDetail(
  db: Kysely<Database>,
  orderId: number,
): Promise<OrderDetail | null> {
  const header = await db
    .selectFrom("sales_order")
    .innerJoin("customer", "customer.id", "sales_order.customer_id")
    .select([
      "sales_order.id as id",
      "sales_order.reference as reference",
      "sales_order.status as status",
      "sales_order.created_at as createdAt",
      "customer.id as customerId",
      "customer.name as customerName",
      "customer.city as city",
    ])
    .where("sales_order.id", "=", orderId)
    .executeTakeFirst();

  if (!header) return null;

  const [lines, tags] = await Promise.all([
    db
      .selectFrom("order_line")
      .innerJoin("product", "product.id", "order_line.product_id")
      .select([
        "order_line.id as id",
        "product.name as productName",
        "order_line.quantity as quantity",
        "order_line.unit_price_cents as unitPriceCents",
        sql<number>`order_line.quantity * order_line.unit_price_cents`.as("lineTotalCents"),
      ])
      .where("order_line.order_id", "=", orderId)
      .execute(),
    db
      .selectFrom("customer_tag")
      .innerJoin("tag", "tag.id", "customer_tag.tag_id")
      .select("tag.label as label")
      .where("customer_tag.customer_id", "=", header.customerId)
      .execute(),
  ]);

  return {
    id: header.id,
    reference: header.reference,
    status: header.status,
    createdAt: header.createdAt,
    customerName: header.customerName,
    city: header.city,
    tags: tags.map((row) => row.label),
    lines: lines.map((line) => ({ ...line, lineTotalCents: Number(line.lineTotalCents) })),
    totalCents: lines.reduce((sum, line) => sum + Number(line.lineTotalCents), 0),
  };
}
