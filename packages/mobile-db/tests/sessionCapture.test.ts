import { beforeAll, describe, expect, test } from "vite-plus/test";
import type { Database, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { createSessionCapture } from "../src/capture/sessionCapture.js";

let sqlite3: Sqlite3Static;

beforeAll(async () => {
  const { default: init } = await import("@sqlite.org/sqlite-wasm");
  sqlite3 = await init();
});

function openDb(): Database {
  const db = new sqlite3.oo1.DB(":memory:");
  db.exec("create table item (id integer primary key, name text, qty integer)");
  db.exec("create table note (body text)");
  return db;
}

interface DecodedChange {
  table: string;
  op: number;
  values: unknown[];
}

function decode(bytes: Uint8Array): DecodedChange[] {
  const { capi, wasm } = sqlite3;
  const changes: DecodedChange[] = [];
  const buffer = wasm.alloc(bytes.length);
  wasm.heap8u().set(bytes, Number(buffer));
  const stack = wasm.pstack.pointer;
  try {
    const iterOut = wasm.pstack.allocPtr();
    expect(capi.sqlite3changeset_start(iterOut, bytes.length, buffer)).toBe(0);
    const iter = wasm.peekPtr(iterOut);
    while (capi.sqlite3changeset_next(iter) === capi.SQLITE_ROW) {
      const [tableOut, columnsOut, opOut, indirectOut] = wasm.pstack.allocPtr(4);
      capi.sqlite3changeset_op(iter, tableOut!, columnsOut!, opOut!, indirectOut!);
      const columns = Number(wasm.peek32(columnsOut!));
      const op = Number(wasm.peek32(opOut!));
      const values: unknown[] = [];
      for (let index = 0; index < columns; index++) {
        values.push(
          op === capi.SQLITE_DELETE
            ? capi.sqlite3changeset_old_js(iter, index)
            : capi.sqlite3changeset_new_js(iter, index),
        );
      }
      changes.push({ table: wasm.cstrToJs(wasm.peekPtr(tableOut!)) ?? "", op, values });
    }
    capi.sqlite3changeset_finalize(iter);
  } finally {
    wasm.pstack.restore(stack);
    wasm.dealloc(buffer);
  }
  return changes;
}

describe("session capture", () => {
  test("an autocommit write yields one changeset with the row values", () => {
    const db = openDb();
    const capture = createSessionCapture(sqlite3, db);
    const tables = capture.start(["item"]);

    expect(tables).toEqual([
      {
        name: "item",
        tracked: true,
        columns: [
          { name: "id", type: "INTEGER", pk: 1 },
          { name: "name", type: "TEXT", pk: 0 },
          { name: "qty", type: "INTEGER", pk: 0 },
        ],
      },
    ]);

    db.exec("insert into item (id, name, qty) values (1, 'bread', 3)");
    const bytes = capture.collect();
    expect(bytes).not.toBeNull();
    expect(decode(bytes!)).toEqual([
      { table: "item", op: sqlite3.capi.SQLITE_INSERT, values: [1, "bread", 3] },
    ]);
    expect(capture.collect()).toBeNull();
  });

  test("nothing is collected while a transaction is open, everything at commit", () => {
    const db = openDb();
    const capture = createSessionCapture(sqlite3, db);
    capture.start("all");

    db.exec("begin");
    db.exec("insert into item (id, name, qty) values (1, 'a', 1)");
    expect(capture.collect()).toBeNull();
    db.exec("insert into item (id, name, qty) values (2, 'b', 2)");
    expect(capture.collect()).toBeNull();
    db.exec("commit");

    expect(decode(capture.collect()!).map((change) => change.values[0])).toEqual([1, 2]);
  });

  test("a rolled-back transaction is discarded", () => {
    const db = openDb();
    const capture = createSessionCapture(sqlite3, db);
    capture.start(["item"]);

    db.exec("begin");
    db.exec("insert into item (id, name, qty) values (1, 'gone', 1)");
    db.exec("rollback");
    expect(capture.collect()).toBeNull();

    db.exec("insert into item (id, name, qty) values (2, 'kept', 1)");
    expect(decode(capture.collect()!)).toEqual([
      { table: "item", op: sqlite3.capi.SQLITE_INSERT, values: [2, "kept", 1] },
    ]);
  });

  test("a table without a primary key is reported as untracked", () => {
    const db = openDb();
    const capture = createSessionCapture(sqlite3, db);
    const tables = capture.start("all");

    expect(tables.find((table) => table.name === "note")?.tracked).toBe(false);
    db.exec("insert into note (body) values ('ignored')");
    expect(capture.collect()).toBeNull();
  });

  test("tables outside the capture are not recorded, and stop ends recording", () => {
    const db = openDb();
    db.exec("create table other (id integer primary key, v text)");
    const capture = createSessionCapture(sqlite3, db);
    capture.start(["item"]);

    db.exec("insert into other (id, v) values (1, 'x')");
    expect(capture.collect()).toBeNull();

    capture.stop();
    db.exec("insert into item (id, name, qty) values (1, 'after', 1)");
    expect(capture.collect()).toBeNull();
  });

  test("an update carries the new values of the changed columns", () => {
    const db = openDb();
    db.exec("insert into item (id, name, qty) values (1, 'bread', 3)");
    const capture = createSessionCapture(sqlite3, db);
    capture.start(["item"]);

    db.exec("update item set qty = 9 where id = 1");
    const [change] = decode(capture.collect()!);
    expect(change?.op).toBe(sqlite3.capi.SQLITE_UPDATE);
    expect(change?.values[2]).toBe(9);
  });
});
