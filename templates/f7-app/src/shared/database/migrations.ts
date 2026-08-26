import { createTableWithDefaults, type MigrationSet } from "@cavulsqa/mobile-db";
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
   * The benchmark's tables. Indexed on `bucket` and `parent_id` on purpose, and `label` left
   * unindexed on purpose - the suite measures an indexed range against a full scan, and needs both.
   */
  "002_benchmark": {
    up: async (db) => {
      await createTableWithDefaults(db, "bench_parent")
        .addColumn("label", "text", (col) => col.notNull().unique())
        .addColumn("bucket", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("amount_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createTable("bench_child")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("parent_id", "integer", (col) =>
          col.notNull().references("bench_parent.id").onDelete("cascade"),
        )
        .addColumn("quantity", "integer", (col) => col.notNull().defaultTo(1))
        .addColumn("unit_price_cents", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

      await db.schema
        .createIndex("idx_bench_parent_bucket")
        .on("bench_parent")
        .column("bucket")
        .execute();
      await db.schema
        .createIndex("idx_bench_child_parent")
        .on("bench_child")
        .column("parent_id")
        .execute();
    },
  },
};
