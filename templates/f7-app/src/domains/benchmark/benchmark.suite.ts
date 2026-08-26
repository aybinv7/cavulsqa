import { sql, type Kysely } from "kysely";
import { datasetRowCount, ensureDataset, SCALE } from "./benchmark.dataset";
import type { Database } from "@/shared/database/schema";

export interface CaseResult {
  name: string;
  group: "write" | "read" | "join" | "transaction" | "concurrency" | "schema";
  /** How many logical operations the case performed. */
  operations: number;
  /** Median of the per-iteration timings, which is what to compare. */
  medianMs: number;
  /** Slowest iteration - where a stall or a lock shows up. */
  worstMs: number;
  totalMs: number;
  /** Per logical operation, so a bulk case is comparable with a single-row one. */
  msPerOperation: number;
  /** Rows touched or returned, so a case cannot look fast by doing nothing. */
  rows?: number;
  note?: string;
}

export interface SuiteResult {
  engine: string;
  /** The PRAGMAs in force. Two runs under different settings are not comparable. */
  pragmas?: readonly string[];
  at: number;
  rowsSeeded: number;
  /** Present only on the run that had to build the dataset. */
  seedMs?: number;
  cases: CaseResult[];
  totalMs: number;
}

/**
 * Median rather than mean: one GC pause skews a mean badly, and the question is what a typical
 * operation costs.
 */
function summarise(
  name: string,
  group: CaseResult["group"],
  timings: number[],
  operationsPerIteration: number,
  extra?: { rows?: number; note?: string },
): CaseResult {
  const sorted = [...timings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const total = timings.reduce((sum, ms) => sum + ms, 0);
  const operations = timings.length * operationsPerIteration;

  return {
    name,
    group,
    operations,
    medianMs: round(median),
    worstMs: round(sorted.at(-1) ?? 0),
    totalMs: round(total),
    msPerOperation: round(total / Math.max(operations, 1)),
    rows: extra?.rows,
    note: extra?.note,
  };
}

const round = (value: number) => Number(value.toFixed(3));

async function time(
  iterations: number,
  work: (index: number) => Promise<unknown>,
): Promise<{ timings: number[]; rows: number }> {
  const timings: number[] = [];
  let rows = 0;
  for (let index = 0; index < iterations; index++) {
    const started = performance.now();
    const outcome = await work(index);
    timings.push(performance.now() - started);
    if (Array.isArray(outcome)) rows += outcome.length;
  }
  return { timings, rows };
}

/**
 * Every shape a distribution app performs, at a cardinality where the answer is not obvious:
 * five- and six-table joins over 40k lines, a group-by with HAVING, pagination 30k rows deep, an
 * unindexed scan, index creation on a full table, a cascading delete, and a 1000-row transaction the
 * size of a sync batch.
 *
 * The dataset is seeded once and left alone. Write cases either target rows they created themselves
 * or clean up after the run, because a suite that shrinks its own dataset gets faster every time and
 * the numbers stop meaning anything.
 */
export async function runBenchmark(
  db: Kysely<Database>,
  onProgress?: (name: string) => void,
): Promise<SuiteResult> {
  const started = performance.now();
  const cases: CaseResult[] = [];
  const step = async (name: string, run: () => Promise<CaseResult>) => {
    onProgress?.(name);
    cases.push(await run());
  };

  const seedStarted = performance.now();
  const { seeded } = await ensureDataset(db, onProgress);
  const seedMs = seeded ? round(performance.now() - seedStarted) : undefined;
  const rowsSeeded = await datasetRowCount(db);

  // ---- reads --------------------------------------------------------------------------------
  await step("Point select by primary key", async () => {
    const { timings } = await time(60, (i) =>
      db
        .selectFrom("bench_order_line")
        .selectAll()
        .where("id", "=", ((i * 617) % SCALE.orderLines) + 1)
        .executeTakeFirst(),
    );
    return summarise("Point select by primary key", "read", timings, 1, {
      note: "One row out of 40k, straight down the index",
    });
  });

  await step("Indexed lookup, 40k table", async () => {
    const { timings, rows } = await time(40, (i) =>
      db
        .selectFrom("bench_order_line")
        .selectAll()
        .where("order_id", "=", ((i * 37) % SCALE.orders) + 1)
        .execute(),
    );
    return summarise("Indexed lookup, 40k table", "read", timings, 1, { rows });
  });

  await step("Composite index lookup", async () => {
    const { timings, rows } = await time(40, (i) =>
      db
        .selectFrom("bench_stock")
        .selectAll()
        .where("warehouse_id", "=", (i % SCALE.warehouses) + 1)
        .where("product_id", "=", ((i * 13) % SCALE.products) + 1)
        .execute(),
    );
    return summarise("Composite index lookup", "read", timings, 1, {
      rows,
      note: "Both columns, neither selective alone",
    });
  });

  await step("Unindexed LIKE over 5k rows", async () => {
    const { timings, rows } = await time(15, (i) =>
      db
        .selectFrom("bench_customer")
        .select(["id", "name"])
        .where("notes", "like", `%sector ${String(i % 12)}%`)
        .execute(),
    );
    return summarise("Unindexed LIKE over 5k rows", "read", timings, 1, {
      rows,
      note: "The search box. A full scan by construction",
    });
  });

  await step("Deep pagination, offset 30k", async () => {
    const { timings, rows } = await time(15, (i) =>
      db
        .selectFrom("bench_order_line")
        .selectAll()
        .orderBy("id")
        .limit(50)
        .offset(30_000 + i * 100)
        .execute(),
    );
    return summarise("Deep pagination, offset 30k", "read", timings, 1, {
      rows,
      note: "SQLite still walks the skipped rows - the cost of OFFSET",
    });
  });

  await step("Sort 10k rows without an index", async () => {
    const { timings, rows } = await time(10, () =>
      db
        .selectFrom("bench_order")
        .select(["id", "total_cents"])
        .orderBy("total_cents", "desc")
        .limit(100)
        .execute(),
    );
    return summarise("Sort 10k rows without an index", "read", timings, 1, {
      rows,
      note: "total_cents is unindexed on purpose",
    });
  });

  await step("Count 40k rows", async () => {
    const { timings } = await time(20, () =>
      db
        .selectFrom("bench_order_line")
        .select(({ fn }) => fn.countAll<number>().as("n"))
        .executeTakeFirst(),
    );
    return summarise("Count 40k rows", "read", timings, 1);
  });

  // ---- joins --------------------------------------------------------------------------------
  await step("Two-table join with aggregate", async () => {
    const { timings, rows } = await time(10, () =>
      db
        .selectFrom("bench_order")
        .innerJoin("bench_order_line", "bench_order_line.order_id", "bench_order.id")
        .select(({ fn }) => [
          "bench_order.status as status",
          fn.count<number>("bench_order_line.id").as("lines"),
        ])
        .groupBy("bench_order.status")
        .execute(),
    );
    return summarise("Two-table join with aggregate", "join", timings, 1, { rows });
  });

  await step("Five-table join, grouped and sorted", async () => {
    const { timings, rows } = await time(8, () =>
      db
        .selectFrom("bench_order_line")
        .innerJoin("bench_order", "bench_order.id", "bench_order_line.order_id")
        .innerJoin("bench_customer", "bench_customer.id", "bench_order.customer_id")
        .innerJoin("bench_city", "bench_city.id", "bench_customer.city_id")
        .innerJoin("bench_region", "bench_region.id", "bench_city.region_id")
        .select(({ fn }) => [
          "bench_region.name as region",
          fn.count<number>("bench_order_line.id").as("lines"),
          sql<number>`sum(bench_order_line.quantity * bench_order_line.unit_price_cents)`.as(
            "revenue",
          ),
        ])
        .groupBy("bench_region.name")
        .orderBy("revenue", "desc")
        .execute(),
    );
    return summarise("Five-table join, grouped and sorted", "join", timings, 1, {
      rows,
      note: "40k lines up through order, customer, city, region",
    });
  });

  await step("Six-table join with HAVING", async () => {
    const { timings, rows } = await time(8, (i) =>
      db
        .selectFrom("bench_order_line")
        .innerJoin("bench_product", "bench_product.id", "bench_order_line.product_id")
        .innerJoin("bench_category", "bench_category.id", "bench_product.category_id")
        .innerJoin("bench_order", "bench_order.id", "bench_order_line.order_id")
        .innerJoin("bench_customer", "bench_customer.id", "bench_order.customer_id")
        .innerJoin("bench_city", "bench_city.id", "bench_customer.city_id")
        .select(({ fn }) => [
          "bench_category.name as category",
          "bench_city.name as city",
          fn.count<number>("bench_order_line.id").as("lines"),
        ])
        .where("bench_order.status", "=", ["draft", "confirmed", "delivered"][i % 3]!)
        .groupBy(["bench_category.name", "bench_city.name"])
        .having((eb) => eb(eb.fn.count("bench_order_line.id"), ">", 2))
        .limit(200)
        .execute(),
    );
    return summarise("Six-table join with HAVING", "join", timings, 1, {
      rows,
      note: "Grouped on two columns across six tables",
    });
  });

  await step("Correlated subquery per row", async () => {
    const { timings, rows } = await time(8, () =>
      db
        .selectFrom("bench_customer")
        .select((eb) => [
          "bench_customer.id",
          eb
            .selectFrom("bench_order")
            .select((e) => e.fn.countAll<number>().as("n"))
            .whereRef("bench_order.customer_id", "=", "bench_customer.id")
            .as("orders"),
        ])
        .limit(300)
        .execute(),
    );
    return summarise("Correlated subquery per row", "join", timings, 1, {
      rows,
      note: "300 subqueries in one statement",
    });
  });

  await step("Left join finding absences", async () => {
    const { timings, rows } = await time(8, () =>
      db
        .selectFrom("bench_order")
        .leftJoin("bench_payment", "bench_payment.order_id", "bench_order.id")
        .select(["bench_order.id"])
        .where("bench_payment.id", "is", null)
        .limit(500)
        .execute(),
    );
    return summarise("Left join finding absences", "join", timings, 1, {
      rows,
      note: "Unpaid orders - what a reconciliation screen asks",
    });
  });

  // ---- writes -------------------------------------------------------------------------------
  await step("Insert one row", async () => {
    const { timings } = await time(30, (i) =>
      db
        .insertInto("bench_payment")
        .values({
          order_id: (i % SCALE.orders) + 1,
          amount_cents: 100,
          method: "bench-single",
          created_at: EPOCH,
        })
        .execute(),
    );
    return summarise("Insert one row", "write", timings, 1, {
      note: "One statement, one commit - the worst case per row",
    });
  });

  await step("Insert 1000 rows in one transaction", async () => {
    const { timings } = await time(3, (run) =>
      db.transaction().execute(async (trx) => {
        for (let i = 0; i < 1000; i++) {
          await trx
            .insertInto("bench_payment")
            .values({
              order_id: (i % SCALE.orders) + 1,
              amount_cents: 1,
              method: `bench-bulk-${String(run)}`,
              created_at: EPOCH,
            })
            .execute();
        }
      }),
    );
    return summarise("Insert 1000 rows in one transaction", "write", timings, 1000, {
      note: "One commit for 1000 rows - what a sync batch should look like",
    });
  });

  await step("Multi-row insert, 150 per statement", async () => {
    const { timings } = await time(4, (run) =>
      db
        .insertInto("bench_payment")
        .values(
          Array.from({ length: 150 }, (_, i) => ({
            order_id: (i % SCALE.orders) + 1,
            amount_cents: 2,
            method: `bench-multi-${String(run)}`,
            created_at: EPOCH,
          })),
        )
        .execute(),
    );
    return summarise("Multi-row insert, 150 per statement", "write", timings, 150, {
      note: "Bounded by SQLite's parameter cap, not by choice",
    });
  });

  await step("Update by primary key", async () => {
    const { timings } = await time(30, (i) =>
      db
        .updateTable("bench_stock")
        .set({ quantity: 500 + i })
        .where("id", "=", ((i * 211) % SCALE.stock) + 1)
        .execute(),
    );
    return summarise("Update by primary key", "write", timings, 1);
  });

  await step("Bulk update, 2000 rows", async () => {
    const { timings } = await time(3, (i) =>
      db
        .updateTable("bench_stock")
        .set({ quantity: 700 + i })
        .where("warehouse_id", "=", (i % SCALE.warehouses) + 1)
        .execute(),
    );
    return summarise("Bulk update, 2000 rows", "write", timings, 2000, {
      note: "One statement over an indexed predicate",
    });
  });

  await step("Update through a subquery", async () => {
    const { timings } = await time(3, () =>
      db
        .updateTable("bench_order")
        .set({
          total_cents: sql<number>`(select coalesce(sum(quantity * unit_price_cents), 0) from bench_order_line where bench_order_line.order_id = bench_order.id)`,
        })
        .where("id", "<=", 500)
        .execute(),
    );
    return summarise("Update through a subquery", "write", timings, 500, {
      note: "Recomputing order totals from their lines",
    });
  });

  await step("Predicate delete over 8k rows", async () => {
    const { timings } = await time(1, () =>
      db.deleteFrom("bench_payment").where("method", "like", "bench-%").execute(),
    );
    return summarise("Predicate delete over 8k rows", "write", timings, 1, {
      note: "Removes everything the write cases added, and measures the delete",
    });
  });

  // ---- transactions -------------------------------------------------------------------------
  await step("Order with lines and payment, one transaction", async () => {
    const { timings } = await time(15, (i) =>
      db.transaction().execute(async (trx) => {
        const order = await trx
          .insertInto("bench_order")
          .values({
            customer_id: (i % SCALE.customers) + 1,
            reference: `BENCH-${String(i)}`,
            status: "draft",
            created_at: EPOCH,
            total_cents: 0,
          })
          .executeTakeFirstOrThrow();

        const orderId = Number(order.insertId ?? 0);
        if (!orderId) throw new Error("the order was written but reported no id");

        for (let line = 0; line < 5; line++) {
          await trx
            .insertInto("bench_order_line")
            .values({
              order_id: orderId,
              product_id: ((i + line) % SCALE.products) + 1,
              quantity: line + 1,
              unit_price_cents: 1000,
            })
            .execute();
        }
        await trx
          .insertInto("bench_payment")
          .values({ order_id: orderId, amount_cents: 5000, method: "bench-tx", created_at: EPOCH })
          .execute();
      }),
    );
    return summarise("Order with lines and payment, one transaction", "transaction", timings, 7, {
      note: "Needs insertId inside a transaction - saving an order",
    });
  });

  await step("Cascading delete", async () => {
    const { timings } = await time(1, () =>
      db.deleteFrom("bench_order").where("reference", "like", "BENCH-%").execute(),
    );
    return summarise("Cascading delete", "transaction", timings, 15, {
      note: "Orders with their lines and payments, restoring the dataset",
    });
  });

  await step("Rollback", async () => {
    const { timings } = await time(10, (i) =>
      db
        .transaction()
        .execute(async (trx) => {
          await trx
            .insertInto("bench_payment")
            .values({
              order_id: (i % SCALE.orders) + 1,
              amount_cents: 1,
              method: "bench-rollback",
              created_at: EPOCH,
            })
            .execute();
          throw new Error("rollback");
        })
        .catch(() => undefined),
    );
    return summarise("Rollback", "transaction", timings, 1, {
      note: "An abandoned write costs something too",
    });
  });

  // ---- schema -------------------------------------------------------------------------------
  await step("Create an index on 40k rows", async () => {
    const { timings } = await time(3, async () => {
      await sql.raw("DROP INDEX IF EXISTS idx_bench_line_qty").execute(db);
      await sql.raw("CREATE INDEX idx_bench_line_qty ON bench_order_line(quantity)").execute(db);
      return null;
    });
    await sql.raw("DROP INDEX IF EXISTS idx_bench_line_qty").execute(db);
    return summarise("Create an index on 40k rows", "schema", timings, 1, {
      note: "What a migration costs on a table that is already full",
    });
  });

  await step("ANALYZE", async () => {
    const { timings } = await time(2, () => sql.raw("ANALYZE").execute(db));
    return summarise("ANALYZE", "schema", timings, 1, {
      note: "The statistics the planner uses to pick an index",
    });
  });

  // ---- concurrency --------------------------------------------------------------------------
  const heavyRead = () =>
    db
      .selectFrom("bench_order_line")
      .innerJoin("bench_order", "bench_order.id", "bench_order_line.order_id")
      .select(({ fn }) => [fn.count<number>("bench_order_line.id").as("n")])
      .where("bench_order.status", "=", "confirmed")
      .execute();

  await step("Five heavy reads, issued together", async () => {
    const { timings } = await time(8, () =>
      Promise.all([heavyRead(), heavyRead(), heavyRead(), heavyRead(), heavyRead()]),
    );
    return summarise("Five heavy reads, issued together", "concurrency", timings, 5, {
      note: "What a screen loading with Promise.all pays",
    });
  });

  await step("Five heavy reads, one at a time", async () => {
    const { timings } = await time(8, async () => {
      for (let i = 0; i < 5; i++) await heavyRead();
      return null;
    });
    return summarise("Five heavy reads, one at a time", "concurrency", timings, 5, {
      note: "The same work awaited in a loop",
    });
  });

  await step("Read while a 1000-row write is in flight", async () => {
    const { timings } = await time(5, (run) => {
      const write = db.transaction().execute(async (trx) => {
        for (let i = 0; i < 1000; i++) {
          await trx
            .insertInto("bench_payment")
            .values({
              order_id: (i % SCALE.orders) + 1,
              amount_cents: 3,
              method: `bench-mixed-${String(run)}`,
              created_at: EPOCH,
            })
            .execute();
        }
      });
      return Promise.all([write, heavyRead()]);
    });
    return summarise("Read while a 1000-row write is in flight", "concurrency", timings, 1, {
      note: "Where a lock that serialises reads behind a sync would show up",
    });
  });

  // Everything this run added, gone - so the next run starts from the same dataset.
  await db.deleteFrom("bench_payment").where("method", "like", "bench-%").execute();
  await db.deleteFrom("bench_order").where("reference", "like", "BENCH-%").execute();

  return {
    engine: "",
    at: 0,
    rowsSeeded,
    seedMs,
    cases,
    totalMs: round(performance.now() - started),
  };
}

/** Fixed, so a row's timestamp never varies between runs. */
const EPOCH = "1970-01-01T00:00:00.000Z";
