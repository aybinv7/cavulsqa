import { expect, test } from "vite-plus/test";
import {
  CompiledQuery,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type Driver,
  type Generated,
} from "kysely";
import { statementFacts } from "../src/statementFacts.js";

interface TestDB {
  customer: { id: Generated<number>; name: string };
  archive: { id: number };
  sales_order: { id: Generated<number>; status: Generated<string> };
  order_line: { id: Generated<number>; order_id: number };
  audit: { id: Generated<number>; payload: string };
}

// Compiles, never executes: the driver is here to satisfy the constructor and nothing calls it.
const db = new Kysely<TestDB>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => ({}) as Driver,
    createQueryCompiler: () => new SqliteQueryCompiler(),
    createIntrospector: (instance) => new SqliteIntrospector(instance),
  },
});

test("a select is not a write", () => {
  const facts = statementFacts(db.selectFrom("customer").selectAll().compile());

  expect(facts).toEqual({ mutates: false, inserts: false, hasReturning: false });
});

test("an insert whose rows come from a select is still a write", () => {
  // The regression this file exists for. The compiled SQL contains "select", so routing on the
  // text sent it down the read path: the plugin ran it, reported no change count, and never
  // flushed the web store - a write that vanished on reload with nothing logged.
  const facts = statementFacts(
    db
      .insertInto("archive")
      .columns(["id"])
      .expression((eb) => eb.selectFrom("customer").select("id"))
      .compile(),
  );

  expect(facts.mutates).toBe(true);
  expect(facts.inserts).toBe(true);
});

test("a delete filtered by a subquery is still a write", () => {
  const facts = statementFacts(
    db
      .deleteFrom("order_line")
      .where("order_id", "in", (eb) =>
        eb.selectFrom("sales_order").select("id").where("status", "=", "draft"),
      )
      .compile(),
  );

  expect(facts.mutates).toBe(true);
  expect(facts.inserts).toBe(false);
});

test("an update filtered by a subquery is still a write", () => {
  const facts = statementFacts(
    db
      .updateTable("sales_order")
      .set({ status: "closed" })
      .where("id", "in", (eb) => eb.selectFrom("order_line").select("order_id"))
      .compile(),
  );

  expect(facts.mutates).toBe(true);
  expect(facts.inserts).toBe(false);
});

test("schema statements are writes", () => {
  const facts = statementFacts(db.schema.createTable("audit").addColumn("id", "integer").compile());

  expect(facts).toEqual({ mutates: true, inserts: false, hasReturning: false });
});

test("RETURNING is read off the tree, not the text", () => {
  const withReturning = statementFacts(
    db.insertInto("customer").values({ name: "A" }).returning("id").compile(),
  );
  const without = statementFacts(db.insertInto("customer").values({ name: "A" }).compile());

  expect(withReturning.hasReturning).toBe(true);
  expect(without.hasReturning).toBe(false);
});

test("only an insert reports an inserted id", () => {
  const inserted = statementFacts(db.insertInto("customer").values({ name: "A" }).compile());
  const updated = statementFacts(
    db.updateTable("customer").set({ name: "B" }).where("id", "=", 1).compile(),
  );

  expect(inserted.inserts).toBe(true);
  expect(updated.inserts).toBe(false);
});

test("a raw pragma reads", () => {
  // Routed as a write before this, which is the one call the plugin refuses for a pragma that
  // reports a value: "Queries can be performed using query or rawQuery methods only".
  expect(statementFacts(CompiledQuery.raw("PRAGMA journal_mode = WAL")).mutates).toBe(false);
});

test("a leading CTE is stepped over", () => {
  const reading = statementFacts(
    CompiledQuery.raw("with recent as (select id from sales_order) select * from recent"),
  );
  const writing = statementFacts(
    CompiledQuery.raw(
      "with recent as (select id from sales_order) insert into archive select id from recent",
    ),
  );

  expect(reading.mutates).toBe(false);
  expect(writing.mutates).toBe(true);
  expect(writing.inserts).toBe(true);
});

test("a keyword inside a string literal is not the statement", () => {
  const facts = statementFacts(
    CompiledQuery.raw("select * from audit where payload = 'insert into customer'"),
  );

  expect(facts.mutates).toBe(false);
});

test("an escaped quote does not end the literal early", () => {
  const facts = statementFacts(
    CompiledQuery.raw("select * from audit where payload = 'it''s an insert'"),
  );

  expect(facts.mutates).toBe(false);
});

test("a keyword inside a comment is not the statement", () => {
  expect(statementFacts(CompiledQuery.raw("-- insert into customer\nselect 1")).mutates).toBe(
    false,
  );
  expect(statementFacts(CompiledQuery.raw("/* insert */ select 1")).mutates).toBe(false);
});

test("raw replace counts as an insert", () => {
  const facts = statementFacts(CompiledQuery.raw("replace into customer values (?)"));

  expect(facts.mutates).toBe(true);
  expect(facts.inserts).toBe(true);
});

test("raw RETURNING is detected", () => {
  const facts = statementFacts(
    CompiledQuery.raw("insert into customer (name) values (?) returning id"),
  );

  expect(facts.hasReturning).toBe(true);
});

test("an unrecognised raw statement is treated as a write", () => {
  // Safe direction: a read sent down the write path errors loudly, a write sent down the read
  // path is silently lost.
  expect(statementFacts(CompiledQuery.raw("vacuum")).mutates).toBe(true);
  expect(statementFacts(CompiledQuery.raw("create table t (id integer)")).mutates).toBe(true);
});
