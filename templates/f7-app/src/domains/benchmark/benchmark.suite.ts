import { sql, type Kysely } from "kysely";
import { nowISO } from "@cavulsqa/mobile-db";
import type { Database } from "@/shared/database/schema";

export interface CaseResult {
  name: string;
  group: "write" | "read" | "transaction" | "concurrency";
  /** How many logical operations the case performed. */
  operations: number;
  /** Median of the per-iteration timings, which is what to compare. */
  medianMs: number;
  /** Slowest iteration - where a stall or a lock shows up. */
  worstMs: number;
  totalMs: number;
  /** Per logical operation, so a bulk case is comparable with a single-row one. */
  msPerOperation: number;
  note?: string;
}

export interface SuiteResult {
  engine: string;
  at: number;
  rowsSeeded: number;
  cases: CaseResult[];
  totalMs: number;
}

/**
 * Median rather than mean: a single GC pause or a WebView hiccup skews a mean badly at these
 * durations, and the question is what a typical operation costs.
 */
function summarise(
  name: string,
  group: CaseResult["group"],
  timings: number[],
  operationsPerIteration: number,
  note?: string,
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
    note,
  };
}

const round = (value: number) => Number(value.toFixed(3));

async function time(
  iterations: number,
  work: (index: number) => Promise<unknown>,
): Promise<number[]> {
  const timings: number[] = [];
  for (let index = 0; index < iterations; index++) {
    const started = performance.now();
    await work(index);
    timings.push(performance.now() - started);
  }
  return timings;
}

/**
 * The benchmark runs against its own two tables, never the app's.
 *
 * Measuring writes against real data would either corrupt it or force a rollback, and a rolled-back
 * transaction never pays the commit - which on a phone is most of what a write costs. `bench_parent`
 * and `bench_child` mirror the order/line shape so the join and aggregate cases are representative.
 */
const SEED_PARENTS = 400;
const CHILDREN_PER_PARENT = 5;

async function reset(db: Kysely<Database>): Promise<void> {
  await sql`DELETE FROM bench_child`.execute(db);
  await sql`DELETE FROM bench_parent`.execute(db);
}

async function seed(db: Kysely<Database>): Promise<number> {
  await reset(db);
  const at = nowISO();

  await db.transaction().execute(async (trx) => {
    for (let parent = 0; parent < SEED_PARENTS; parent++) {
      const inserted = await trx
        .insertInto("bench_parent")
        .values({
          created_at: at,
          label: `parent-${String(parent)}`,
          bucket: parent % 20,
          amount_cents: 1000 + parent * 7,
        })
        .executeTakeFirstOrThrow();

      const parentId = Number(inserted.insertId ?? 0);
      for (let child = 0; child < CHILDREN_PER_PARENT; child++) {
        await trx
          .insertInto("bench_child")
          .values({
            parent_id: parentId,
            quantity: 1 + ((parent + child) % 9),
            unit_price_cents: 250 + child * 40,
          })
          .execute();
      }
    }
  });

  return SEED_PARENTS * (1 + CHILDREN_PER_PARENT);
}

/**
 * Every case a screen in this app actually performs, plus the ones that expose an engine's weak
 * spot: a write outside a transaction, a write inside one, a compare-and-set, a join with an
 * aggregate, an unindexed scan, and the same reads issued together against one at a time.
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

  const rowsSeeded = await seed(db);
  const at = nowISO();

  // ---- writes -------------------------------------------------------------------------------
  await step("Insert one row", async () =>
    summarise(
      "Insert one row",
      "write",
      await time(40, (index) =>
        db
          .insertInto("bench_parent")
          .values({
            created_at: at,
            label: `single-${String(index)}`,
            bucket: index % 20,
            amount_cents: 500,
          })
          .execute(),
      ),
      1,
      "One statement, one commit - the worst case per row",
    ),
  );

  await step("Insert 200 rows in one transaction", async () =>
    summarise(
      "Insert 200 rows in one transaction",
      "write",
      await time(3, (run) =>
        db.transaction().execute(async (trx) => {
          for (let index = 0; index < 200; index++) {
            await trx
              .insertInto("bench_parent")
              .values({
                created_at: at,
                label: `bulk-${String(run)}-${String(index)}`,
                bucket: index % 20,
                amount_cents: 900,
              })
              .execute();
          }
        }),
      ),
      200,
      "One commit for 200 rows - what a sync batch should look like",
    ),
  );

  await step("Update by primary key", async () =>
    summarise(
      "Update by primary key",
      "write",
      await time(40, (index) =>
        db
          .updateTable("bench_parent")
          .set({ amount_cents: 1234 + index })
          .where("id", "=", index + 1)
          .execute(),
      ),
      1,
    ),
  );

  await step("Compare-and-set", async () =>
    summarise(
      "Compare-and-set",
      "write",
      await time(30, (index) =>
        db
          .updateTable("bench_parent")
          .set({ label: `cas-${String(index)}` })
          .where("id", "=", index + 1)
          .where("amount_cents", "=", 1234 + index)
          .execute(),
      ),
      1,
      "Needs a truthful affected-row count, not just success",
    ),
  );

  await step("Delete by primary key", async () =>
    summarise(
      "Delete by primary key",
      "write",
      await time(30, (index) =>
        db
          .deleteFrom("bench_parent")
          .where("label", "=", `single-${String(index)}`)
          .execute(),
      ),
      1,
    ),
  );

  await step("Upsert on conflict", async () =>
    summarise(
      "Upsert on conflict",
      "write",
      await time(30, (index) =>
        db
          .insertInto("bench_parent")
          .values({
            created_at: at,
            label: `upsert-${String(index % 5)}`,
            bucket: 1,
            amount_cents: index,
          })
          .onConflict((oc) => oc.column("label").doUpdateSet({ amount_cents: index }))
          .execute(),
      ),
      1,
      "Five labels, thirty writes - so most of them take the update path",
    ),
  );

  // ---- reads --------------------------------------------------------------------------------
  await step("Select by primary key", async () =>
    summarise(
      "Select by primary key",
      "read",
      await time(60, (index) =>
        db
          .selectFrom("bench_parent")
          .selectAll()
          .where("id", "=", (index % SEED_PARENTS) + 1)
          .executeTakeFirst(),
      ),
      1,
    ),
  );

  await step("Indexed range, 50 rows", async () =>
    summarise(
      "Indexed range, 50 rows",
      "read",
      await time(30, (index) =>
        db
          .selectFrom("bench_parent")
          .selectAll()
          .where("bucket", "=", index % 20)
          .orderBy("id", "desc")
          .limit(50)
          .execute(),
      ),
      1,
    ),
  );

  await step("LIKE scan, no index", async () =>
    summarise(
      "LIKE scan, no index",
      "read",
      await time(20, (index) =>
        db
          .selectFrom("bench_parent")
          .selectAll()
          .where("label", "like", `%-${String(index % 20)}%`)
          .limit(50)
          .execute(),
      ),
      1,
      "The search box. A full scan by construction",
    ),
  );

  await step("Join with aggregate", async () =>
    summarise(
      "Join with aggregate",
      "read",
      await time(20, () =>
        db
          .selectFrom("bench_parent")
          .innerJoin("bench_child", "bench_child.parent_id", "bench_parent.id")
          .select(({ fn }) => [
            "bench_parent.bucket as bucket",
            fn.count<number>("bench_child.id").as("lines"),
            sql<number>`sum(bench_child.quantity * bench_child.unit_price_cents)`.as("total"),
          ])
          .groupBy("bench_parent.bucket")
          .orderBy("total", "desc")
          .execute(),
      ),
      1,
      "Two tables, group by, sum - the dashboard's shape",
    ),
  );

  await step("Count all rows", async () =>
    summarise(
      "Count all rows",
      "read",
      await time(20, () =>
        db
          .selectFrom("bench_child")
          .select(({ fn }) => fn.countAll<number>().as("n"))
          .executeTakeFirst(),
      ),
      1,
    ),
  );

  await step("Correlated subqueries in one round trip", async () =>
    summarise(
      "Correlated subqueries in one round trip",
      "read",
      await time(20, () =>
        db
          .selectNoFrom((eb) => [
            eb
              .selectFrom("bench_parent")
              .select((e) => e.fn.countAll<number>().as("n"))
              .as("parents"),
            eb
              .selectFrom("bench_child")
              .select((e) => e.fn.countAll<number>().as("n"))
              .as("children"),
            eb
              .selectFrom("bench_child")
              .select(sql<number>`coalesce(sum(quantity * unit_price_cents), 0)`.as("n"))
              .as("revenue"),
          ])
          .executeTakeFirst(),
      ),
      1,
      "Eight numbers for one statement instead of eight statements",
    ),
  );

  // ---- transactions and concurrency ---------------------------------------------------------
  await step("Parent plus five children, one transaction", async () =>
    summarise(
      "Parent plus five children, one transaction",
      "transaction",
      await time(20, (index) =>
        db.transaction().execute(async (trx) => {
          const inserted = await trx
            .insertInto("bench_parent")
            .values({
              created_at: at,
              label: `tx-${String(index)}`,
              bucket: index % 20,
              amount_cents: 777,
            })
            .executeTakeFirstOrThrow();

          const parentId = Number(inserted.insertId ?? 0);
          if (!parentId) throw new Error("the parent was written but reported no id");

          for (let child = 0; child < 5; child++) {
            await trx
              .insertInto("bench_child")
              .values({ parent_id: parentId, quantity: child + 1, unit_price_cents: 300 })
              .execute();
          }
        }),
      ),
      6,
      "Needs insertId inside a transaction - saving an order",
    ),
  );

  await step("Rollback", async () =>
    summarise(
      "Rollback",
      "transaction",
      await time(15, (index) =>
        db
          .transaction()
          .execute(async (trx) => {
            await trx
              .insertInto("bench_parent")
              .values({
                created_at: at,
                label: `rollback-${String(index)}`,
                bucket: 0,
                amount_cents: 1,
              })
              .execute();
            throw new Error("rollback");
          })
          .catch(() => undefined),
      ),
      1,
      "An abandoned write costs something too",
    ),
  );

  const read = () => db.selectFrom("bench_parent").select("id").limit(5).execute();

  await step("Five reads, issued together", async () =>
    summarise(
      "Five reads, issued together",
      "concurrency",
      await time(20, () => Promise.all([read(), read(), read(), read(), read()])),
      5,
      "What a screen loading with Promise.all pays",
    ),
  );

  await step("Five reads, one at a time", async () =>
    summarise(
      "Five reads, one at a time",
      "concurrency",
      await time(20, async () => {
        for (let index = 0; index < 5; index++) await read();
      }),
      5,
      "The same work awaited in a loop",
    ),
  );

  await step("Read while a write is in flight", async () =>
    summarise(
      "Read while a write is in flight",
      "concurrency",
      await time(15, (index) => {
        const write = db
          .insertInto("bench_parent")
          .values({
            created_at: at,
            label: `mixed-${String(index)}`,
            bucket: 2,
            amount_cents: 42,
          })
          .execute();
        return Promise.all([write, read()]);
      }),
      2,
      "Where a lock that serialises reads would show up",
    ),
  );

  await reset(db);

  return {
    engine: "",
    at: 0,
    rowsSeeded,
    cases,
    totalMs: round(performance.now() - started),
  };
}
