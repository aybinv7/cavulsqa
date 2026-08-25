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
}
