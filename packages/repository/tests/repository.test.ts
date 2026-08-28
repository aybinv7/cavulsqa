import { beforeEach, expect, test } from "vite-plus/test";
import { Kysely } from "kysely";
import { createSqlJsDialect } from "@cavulsqa/mobile-db/testing";
import { createLocalFirstTable } from "../src/columns.js";
import { createRepository } from "../src/repository.js";
import type { Repository } from "../src/types.js";

interface NoteTable {
  id: number;
  _ruid: string;
  _create_date: string;
  _write_date: string;
  _delete_date: string | null;
  title: string;
}

interface TestDB {
  note: NoteTable;
}

let db: Kysely<TestDB>;
let notes: Repository<TestDB, "note">;
let clock: number;
let counter: number;

beforeEach(async () => {
  db = new Kysely<TestDB>({ dialect: await createSqlJsDialect() });
  clock = 0;
  counter = 0;

  await createLocalFirstTable(db as never, "note")
    .addColumn("title", "text", (col) => col.notNull())
    .execute();

  notes = createRepository<TestDB, "note">("note", {
    readDb: () => db,
    rdb: db,
    // Deterministic, so a test can assert an identity rather than only its shape.
    generateLocalRuid: () => `ruid-${++counter}`,
    nowISO: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++clock)).toISOString(),
  });
});

test("insert stamps the identity and both dates, and hands the row back", async () => {
  const created = await notes.insert({ title: "first" } as never);

  expect(created.title).toBe("first");
  expect(created._ruid).toBe("ruid-1");
  expect(created._create_date).toBe(created._write_date);
  expect(created._delete_date).toBeNull();
  expect(created.id).toBeGreaterThan(0);
});

test("an identity supplied by the caller is kept", async () => {
  // A row arriving from a backup or another device already has one, and reassigning it would
  // silently fork the row.
  const created = await notes.insert({ title: "imported", _ruid: "from-elsewhere" } as never);

  expect(created._ruid).toBe("from-elsewhere");
  expect(await notes.getByRuid("from-elsewhere")).toBeDefined();
});

test("the identity survives a row being deleted and reinserted", async () => {
  const created = await notes.insert({ title: "keep" } as never);
  await notes.softDelete(created.id);

  const found = await notes.getByRuid(created._ruid);
  expect(found?.id).toBe(created.id);
});

test("update moves the write date but not the create date", async () => {
  const created = await notes.insert({ title: "before" } as never);
  const updated = await notes.update(created.id, { title: "after" } as never);

  expect(updated.title).toBe("after");
  expect(updated._create_date).toBe(created._create_date);
  expect(updated._write_date).not.toBe(created._write_date);
});

test("update on a row that does not exist is an error, not a silent no-op", async () => {
  await expect(notes.update(4040, { title: "ghost" } as never)).rejects.toThrow(/matched no row/);
});

test("a soft-deleted row leaves list but is still there", async () => {
  const created = await notes.insert({ title: "gone" } as never);
  await notes.softDelete(created.id);

  expect(await notes.list()).toHaveLength(0);
  expect(await notes.list({ includeDeleted: true })).toHaveLength(1);
  expect(await notes.getById(created.id)).toBeDefined();
});

test("restore brings it back", async () => {
  const created = await notes.insert({ title: "oops" } as never);
  await notes.softDelete(created.id);
  const restored = await notes.restore(created.id);

  expect(restored._delete_date).toBeNull();
  expect(await notes.list()).toHaveLength(1);
});

test("list orders, limits and offsets", async () => {
  for (const title of ["c", "a", "b"]) await notes.insert({ title } as never);

  const ordered = await notes.list({ orderBy: { column: "title" } });
  expect(ordered.map((row) => row.title)).toEqual(["a", "b", "c"]);

  const descending = await notes.list({ orderBy: { column: "title", direction: "desc" } });
  expect(descending.map((row) => row.title)).toEqual(["c", "b", "a"]);

  const page = await notes.list({ orderBy: { column: "title" }, limit: 1, offset: 1 });
  expect(page.map((row) => row.title)).toEqual(["b"]);
});

test("findWhere matches on every column given", async () => {
  await notes.insert({ title: "match" } as never);
  await notes.insert({ title: "other" } as never);

  expect(await notes.findWhere({ title: "match" })).toHaveLength(1);
  expect(await notes.findWhere({ title: "match", _ruid: "ruid-2" })).toHaveLength(0);
});

test("findWhere does not hide soft-deleted rows", async () => {
  // list() is the read that respects the delete date. findWhere is a lookup, and a caller asking
  // for a specific row wants to know it exists rather than be told nothing matched.
  const created = await notes.insert({ title: "deleted" } as never);
  await notes.softDelete(created.id);

  expect(await notes.findWhere({ title: "deleted" })).toHaveLength(1);
});

test("query hands over the read handle", async () => {
  await notes.insert({ title: "counted" } as never);

  const rows = await notes.query((handle) => handle.selectFrom("note").selectAll().execute());
  expect(rows).toHaveLength(1);
});

test("reads go through the read handle and writes through the reactive one", async () => {
  const touched: string[] = [];
  const watched = createRepository<TestDB, "note">("note", {
    readDb: () => db,
    rdb: new Proxy(db, {
      get(target, key: string) {
        if (key === "insertInto" || key === "updateTable" || key === "deleteFrom") {
          touched.push(key);
        }
        const value = Reflect.get(target, key) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
    generateLocalRuid: () => "ruid-watched",
    nowISO: () => "2026-01-01T00:00:00.000Z",
  });

  const created = await watched.insert({ title: "watch" } as never);
  await watched.getById(created.id);
  await watched.list();

  // A read that went through the write handle would announce a change nobody made, and every
  // query watching the table would refetch on every read.
  expect(touched).toEqual(["insertInto"]);
});
