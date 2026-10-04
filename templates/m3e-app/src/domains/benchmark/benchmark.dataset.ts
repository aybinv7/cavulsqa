import { sql, type Insertable, type Kysely } from "kysely";
import type { Database } from "@/shared/database/schema";

/**
 * Roughly 100k rows across ten tables, with the cardinality spread a real domain has: ten regions,
 * five thousand customers, forty thousand order lines. A join across five of these touches a 10-row
 * table and a 40k-row table in one query, which is where index choice starts to show.
 */
export const SCALE = {
  regions: 10,
  cities: 200,
  customers: 5_000,
  categories: 50,
  products: 2_000,
  warehouses: 20,
  /** warehouses x a slice of products, the biggest table here. */
  stock: 40_000,
  orders: 10_000,
  /** ~4 lines per order. */
  orderLines: 40_000,
  payments: 8_000,
} as const;

export const TOTAL_ROWS = Object.values(SCALE).reduce((sum, n) => sum + n, 0);

/**
 * SQLite caps the parameters in one statement - 999 on older builds - so a multi-row insert is
 * chunked by parameter budget rather than by row count. One statement per chunk instead of one per
 * row turns a 75-second seed into a few seconds; at 0.7 ms per single-row insert, 100k rows one at a
 * time would take over a minute of pure commit.
 */
const PARAMETER_BUDGET = 900;

async function insertMany<T extends keyof Database>(
  db: Kysely<Database>,
  table: T & string,
  rows: Insertable<Database[T]>[],
): Promise<void> {
  if (!rows.length) return;
  const columns = Object.keys(rows[0] as object).length;
  const chunk = Math.max(1, Math.floor(PARAMETER_BUDGET / Math.max(columns, 1)));

  for (let index = 0; index < rows.length; index += chunk) {
    await db
      .insertInto(table)
      .values(rows.slice(index, index + chunk) as never)
      .execute();
  }
}

const NAMES = ["Alger", "Oran", "Blida", "Setif", "Annaba", "Batna", "Djelfa", "Biskra"];
const METHODS = ["cash", "cheque", "transfer", "credit"];
const STATUSES = ["draft", "confirmed", "delivered", "cancelled"];

/** Deterministic, so two runs seed the same data and a slow query is slow for the same reason. */
function pseudo(seed: number, modulo: number): number {
  return ((seed * 1103515245 + 12345) >>> 8) % modulo;
}

export async function datasetRowCount(db: Kysely<Database>): Promise<number> {
  const row = await db
    .selectNoFrom((eb) => [
      eb
        .selectFrom("bench_order_line")
        .select((e) => e.fn.countAll<number>().as("n"))
        .as("lines"),
      eb
        .selectFrom("bench_stock")
        .select((e) => e.fn.countAll<number>().as("n"))
        .as("stock"),
    ])
    .executeTakeFirst();
  return Number(row?.lines ?? 0) + Number(row?.stock ?? 0);
}

/**
 * Seeds once and stays. Re-seeding on every run would dominate the measurement, and a dataset that
 * changes between runs makes two runs incomparable - so this is skipped when the row counts already
 * match, and the write cases below are careful to leave the dataset as they found it.
 */
export async function ensureDataset(
  db: Kysely<Database>,
  onProgress?: (what: string) => void,
): Promise<{ seeded: boolean; rows: number }> {
  const existing = await datasetRowCount(db);
  if (existing >= SCALE.orderLines + SCALE.stock) return { seeded: false, rows: existing };

  const at = new Date(0).toISOString();
  const step = (what: string) => onProgress?.(`seeding ${what}`);

  // Cleared in dependency order; a partial previous seed must not survive.
  step("reset");
  for (const table of [
    "bench_payment",
    "bench_order_line",
    "bench_order",
    "bench_stock",
    "bench_product",
    "bench_category",
    "bench_customer",
    "bench_city",
    "bench_region",
    "bench_warehouse",
  ] as const) {
    await sql.raw(`DELETE FROM ${table}`).execute(db);
  }

  step("regions and cities");
  await insertMany(
    db,
    "bench_region",
    Array.from({ length: SCALE.regions }, (_, i) => ({ name: `Region ${String(i + 1)}` })),
  );
  await insertMany(
    db,
    "bench_city",
    Array.from({ length: SCALE.cities }, (_, i) => ({
      region_id: (i % SCALE.regions) + 1,
      name: `${NAMES[i % NAMES.length]} ${String(i + 1)}`,
    })),
  );

  step("customers");
  await insertMany(
    db,
    "bench_customer",
    Array.from({ length: SCALE.customers }, (_, i) => ({
      city_id: (i % SCALE.cities) + 1,
      code: `C${String(i + 1).padStart(6, "0")}`,
      name: `Customer ${String(i + 1)}`,
      // Long enough that a LIKE scan over 5k rows is real work, and varied so it matches sparsely.
      notes: `route ${String(pseudo(i, 40))} sector ${String(pseudo(i + 7, 12))} ${NAMES[pseudo(i, NAMES.length)]} follow-up pending review`,
      credit_cents: pseudo(i, 500_000),
      created_at: at,
    })),
  );

  step("catalogue");
  await insertMany(
    db,
    "bench_category",
    Array.from({ length: SCALE.categories }, (_, i) => ({ name: `Category ${String(i + 1)}` })),
  );
  await insertMany(
    db,
    "bench_product",
    Array.from({ length: SCALE.products }, (_, i) => ({
      category_id: (i % SCALE.categories) + 1,
      sku: `SKU${String(i + 1).padStart(6, "0")}`,
      name: `Product ${String(i + 1)}`,
      price_cents: 500 + pseudo(i, 200_000),
    })),
  );

  step("warehouses and stock");
  await insertMany(
    db,
    "bench_warehouse",
    Array.from({ length: SCALE.warehouses }, (_, i) => ({ name: `Warehouse ${String(i + 1)}` })),
  );
  await insertMany(
    db,
    "bench_stock",
    Array.from({ length: SCALE.stock }, (_, i) => ({
      warehouse_id: (i % SCALE.warehouses) + 1,
      product_id: (i % SCALE.products) + 1,
      quantity: pseudo(i, 900),
    })),
  );

  step("orders");
  await insertMany(
    db,
    "bench_order",
    Array.from({ length: SCALE.orders }, (_, i) => ({
      customer_id: (i % SCALE.customers) + 1,
      reference: `SO-${String(i + 1).padStart(7, "0")}`,
      status: STATUSES[pseudo(i, STATUSES.length)]!,
      created_at: at,
      total_cents: pseudo(i, 400_000),
    })),
  );

  step("order lines");
  await insertMany(
    db,
    "bench_order_line",
    Array.from({ length: SCALE.orderLines }, (_, i) => ({
      order_id: (i % SCALE.orders) + 1,
      product_id: pseudo(i, SCALE.products) + 1,
      quantity: 1 + pseudo(i, 12),
      unit_price_cents: 500 + pseudo(i + 3, 200_000),
    })),
  );

  step("payments");
  await insertMany(
    db,
    "bench_payment",
    Array.from({ length: SCALE.payments }, (_, i) => ({
      order_id: (i % SCALE.orders) + 1,
      amount_cents: pseudo(i, 300_000),
      method: METHODS[pseudo(i, METHODS.length)]!,
      created_at: at,
    })),
  );

  return { seeded: true, rows: await datasetRowCount(db) };
}
