import type { Generated } from "kysely";

/**
 * A small relational schema rather than one flat table, so the demo can show what the reactive
 * layer is actually for: a write to one table refreshing a screen that reads three others through
 * joins and aggregates.
 *
 * customer 1-N sales_order 1-N order_line N-1 product, plus customer N-N tag through customer_tag.
 */
export interface CustomerTable {
  id: Generated<number>;
  created_at: string;
  name: string;
  city: string;
}

export interface ProductTable {
  id: Generated<number>;
  created_at: string;
  name: string;
  /** Integer cents. Money in a float is a rounding bug waiting for a total. */
  price_cents: number;
}

export interface SalesOrderTable {
  id: Generated<number>;
  created_at: string;
  customer_id: number;
  reference: string;
  status: "draft" | "confirmed" | "delivered";
}

export interface OrderLineTable {
  id: Generated<number>;
  order_id: number;
  product_id: number;
  quantity: number;
  /** Copied from the product at the time of sale, so later price changes do not rewrite history. */
  unit_price_cents: number;
}

export interface TagTable {
  id: Generated<number>;
  label: string;
}

export interface CustomerTagTable {
  customer_id: number;
  tag_id: number;
}

export interface Database {
  customer: CustomerTable;
  product: ProductTable;
  sales_order: SalesOrderTable;
  order_line: OrderLineTable;
  tag: TagTable;
  customer_tag: CustomerTagTable;
  bench_region: BenchRegionTable;
  bench_city: BenchCityTable;
  bench_customer: BenchCustomerTable;
  bench_category: BenchCategoryTable;
  bench_product: BenchProductTable;
  bench_warehouse: BenchWarehouseTable;
  bench_stock: BenchStockTable;
  bench_order: BenchOrderTable;
  bench_order_line: BenchOrderLineTable;
  bench_payment: BenchPaymentTable;
}

/**
 * The benchmark's own tables, deliberately separate from the app's.
 *
 * Ten tables at roughly 100k rows, shaped like a distribution domain - regions down to order lines,
 * plus stock and payments - because the questions worth answering are about joins across a real
 * cardinality spread, not about two tables with a foreign key. A five-level join here touches a
 * 10-row table and a 40k-row table in the same query, which is where planners and indexes start to
 * matter.
 *
 * Measuring against the app's own tables would either corrupt them or force a rollback, and a
 * rolled-back transaction never pays the commit - most of what a write costs on a phone.
 */
export interface BenchRegionTable {
  id: Generated<number>;
  name: string;
}

export interface BenchCityTable {
  id: Generated<number>;
  region_id: number;
  name: string;
}

export interface BenchCustomerTable {
  id: Generated<number>;
  city_id: number;
  code: string;
  name: string;
  /** Unindexed on purpose: the LIKE case needs a genuine full scan over 5k rows. */
  notes: string;
  credit_cents: number;
  created_at: string;
}

export interface BenchCategoryTable {
  id: Generated<number>;
  name: string;
}

export interface BenchProductTable {
  id: Generated<number>;
  category_id: number;
  sku: string;
  name: string;
  price_cents: number;
}

export interface BenchWarehouseTable {
  id: Generated<number>;
  name: string;
}

export interface BenchStockTable {
  id: Generated<number>;
  warehouse_id: number;
  product_id: number;
  quantity: number;
}

export interface BenchOrderTable {
  id: Generated<number>;
  customer_id: number;
  reference: string;
  status: string;
  created_at: string;
  total_cents: number;
}

export interface BenchOrderLineTable {
  id: Generated<number>;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price_cents: number;
}

export interface BenchPaymentTable {
  id: Generated<number>;
  order_id: number;
  amount_cents: number;
  method: string;
  created_at: string;
}
