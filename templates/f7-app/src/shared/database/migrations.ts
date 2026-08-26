import { createTableWithDefaults, type MigrationSet } from "@cavulsqa/mobile-db/core";
import { sql } from "kysely";

/**
 * Keys are ordered lexically and recorded once applied, so they are numbered and never renamed:
 * renaming one makes it run again on a database that already has it.
 *
 * Foreign keys are declared for the shape, and indexed on the columns the screens actually filter
 * and join by - without them every dashboard aggregate is a full scan.
 */
export const migrations: MigrationSet = {
  "001_sales": {
    up: async (db) => {
      await createTableWithDefaults(db, "customer")
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("city", "text", (col) => col.notNull().defaultTo(""))
        .execute();

      await createTableWithDefaults(db, "product")
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("price_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await createTableWithDefaults(db, "sales_order")
        .addColumn("customer_id", "integer", (col) =>
          col.notNull().references("customer.id").onDelete("cascade"),
        )
        .addColumn("reference", "text", (col) => col.notNull())
        .addColumn("status", "text", (col) => col.notNull().defaultTo("draft"))
        .execute();

      await db.schema
        .createTable("order_line")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("order_id", "integer", (col) =>
          col.notNull().references("sales_order.id").onDelete("cascade"),
        )
        .addColumn("product_id", "integer", (col) => col.notNull().references("product.id"))
        .addColumn("quantity", "integer", (col) => col.notNull().defaultTo(1))
        .addColumn("unit_price_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("tag")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("label", "text", (col) => col.notNull().unique())
        .execute();

      await db.schema
        .createTable("customer_tag")
        .addColumn("customer_id", "integer", (col) =>
          col.notNull().references("customer.id").onDelete("cascade"),
        )
        .addColumn("tag_id", "integer", (col) =>
          col.notNull().references("tag.id").onDelete("cascade"),
        )
        .addPrimaryKeyConstraint("customer_tag_pk", ["customer_id", "tag_id"])
        .execute();

      await db.schema
        .createIndex("idx_sales_order_customer")
        .on("sales_order")
        .column("customer_id")
        .execute();
      await db.schema
        .createIndex("idx_order_line_order")
        .on("order_line")
        .column("order_id")
        .execute();
      await db.schema
        .createIndex("idx_order_line_product")
        .on("order_line")
        .column("product_id")
        .execute();
      await db.schema.createIndex("idx_customer_city").on("customer").column("city").execute();

      // SQLite ignores foreign keys unless asked, and the plugin opens with them off.
      await sql`PRAGMA foreign_keys = ON`.execute(db);
    },
  },

  /**
   * A tombstone, and it has to stay.
   *
   * This migration created the two-table benchmark that 003 replaced. Deleting the entry rather than
   * emptying it is what broke the app: kysely records applied migrations by key, finds one recorded
   * that the provider no longer offers, calls the history corrupted and applies *nothing* - so 003
   * never ran and the first query failed with "no such table: bench_order_line".
   *
   * An applied migration is a fact about databases in the world. It can stop doing anything; it
   * cannot stop existing.
   */
  "002_benchmark": {
    up: async () => {
      // Its tables are created and dropped by 003; there is nothing left for this to do.
    },
  },

  /**
   * The benchmark's tables, replacing the two-table version outright - this is R&D and nothing
   * depends on the old shape.
   *
   * Indexed where a screen would index: foreign keys, the columns joins and filters use, and one
   * composite for the stock lookup. `bench_customer.notes` is deliberately left unindexed so the
   * LIKE case measures a genuine scan, and `bench_order.total_cents` too, so one case has to sort
   * without help.
   */
  "003_benchmark_scale": {
    up: async (db) => {
      await db.schema.dropTable("bench_child").ifExists().execute();
      await db.schema.dropTable("bench_parent").ifExists().execute();

      await db.schema
        .createTable("bench_region")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("bench_city")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("region_id", "integer", (col) => col.notNull().references("bench_region.id"))
        .addColumn("name", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("bench_customer")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("city_id", "integer", (col) => col.notNull().references("bench_city.id"))
        .addColumn("code", "text", (col) => col.notNull().unique())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("notes", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("credit_cents", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("created_at", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("bench_category")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("bench_product")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("category_id", "integer", (col) => col.notNull().references("bench_category.id"))
        .addColumn("sku", "text", (col) => col.notNull().unique())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("price_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("bench_warehouse")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("bench_stock")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("warehouse_id", "integer", (col) =>
          col.notNull().references("bench_warehouse.id"),
        )
        .addColumn("product_id", "integer", (col) => col.notNull().references("bench_product.id"))
        .addColumn("quantity", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("bench_order")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("customer_id", "integer", (col) =>
          col.notNull().references("bench_customer.id").onDelete("cascade"),
        )
        .addColumn("reference", "text", (col) => col.notNull())
        .addColumn("status", "text", (col) => col.notNull().defaultTo("draft"))
        .addColumn("created_at", "text", (col) => col.notNull())
        .addColumn("total_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("bench_order_line")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("order_id", "integer", (col) =>
          col.notNull().references("bench_order.id").onDelete("cascade"),
        )
        .addColumn("product_id", "integer", (col) => col.notNull().references("bench_product.id"))
        .addColumn("quantity", "integer", (col) => col.notNull().defaultTo(1))
        .addColumn("unit_price_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("bench_payment")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("order_id", "integer", (col) =>
          col.notNull().references("bench_order.id").onDelete("cascade"),
        )
        .addColumn("amount_cents", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("method", "text", (col) => col.notNull())
        .addColumn("created_at", "text", (col) => col.notNull())
        .execute();

      for (const [name, table, column] of [
        ["idx_bench_city_region", "bench_city", "region_id"],
        ["idx_bench_customer_city", "bench_customer", "city_id"],
        ["idx_bench_product_category", "bench_product", "category_id"],
        ["idx_bench_order_customer", "bench_order", "customer_id"],
        ["idx_bench_order_status", "bench_order", "status"],
        ["idx_bench_line_order", "bench_order_line", "order_id"],
        ["idx_bench_line_product", "bench_order_line", "product_id"],
        ["idx_bench_payment_order", "bench_payment", "order_id"],
      ] as const) {
        await db.schema.createIndex(name).on(table).column(column).execute();
      }

      // Composite, because a stock lookup filters on both and neither alone is selective enough.
      await db.schema
        .createIndex("idx_bench_stock_warehouse_product")
        .on("bench_stock")
        .columns(["warehouse_id", "product_id"])
        .execute();
    },
  },
};
