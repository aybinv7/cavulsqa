import { sql, type Kysely } from "kysely";
import { nowISO } from "@cavulsqa/mobile-db";
import type { Database } from "@/shared/database/schema";

export interface DashboardStats {
  customers: number;
  products: number;
  orders: number;
  revenueCents: number;
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
    ])
    .executeTakeFirstOrThrow()
    .then((row) => ({
      customers: Number(row.customers ?? 0),
      products: Number(row.products ?? 0),
      orders: Number(row.orders ?? 0),
      revenueCents: Number(row.revenue ?? 0),
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

/** Every write goes through `rdb`, so each announces the tables it touched. */
export async function seedSampleData(db: Kysely<Database>, customers = 6): Promise<void> {
  const at = nowISO();

  for (const [name, price] of PRODUCTS) {
    await db.insertInto("product").values({ created_at: at, name, price_cents: price }).execute();
  }

  for (const label of TAGS) {
    await db.insertInto("tag").values({ label }).execute();
  }

  const products = await db.selectFrom("product").select(["id", "price_cents"]).execute();
  const tags = await db.selectFrom("tag").select("id").execute();

  for (let index = 0; index < customers; index++) {
    const inserted = await db
      .insertInto("customer")
      .values({
        created_at: at,
        name: `Customer ${String(index + 1)}`,
        city: CITIES[index % CITIES.length] ?? "Algiers",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const tag = tags[index % tags.length];
    if (tag) {
      await db
        .insertInto("customer_tag")
        .values({ customer_id: inserted.id, tag_id: tag.id })
        .execute();
    }

    for (let orderIndex = 0; orderIndex < 2; orderIndex++) {
      await createOrder(db, inserted.id, products.slice(0, 2 + ((index + orderIndex) % 3)));
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

  const order = await db
    .insertInto("sales_order")
    .values({ created_at: at, customer_id: customerId, reference, status: "draft" })
    .returning("id")
    .executeTakeFirstOrThrow();

  for (const [index, line] of lines.entries()) {
    await db
      .insertInto("order_line")
      .values({
        order_id: order.id,
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
