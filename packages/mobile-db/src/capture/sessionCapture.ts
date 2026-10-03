import type { Database, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import type { CapturedColumn, CapturedTable, CaptureTables } from "./types.js";

/** The worker half of a change capture, over the official build's session extension. */
export interface SessionCapture {
  start(tables: CaptureTables): CapturedTable[];
  stop(): void;
  /**
   * Called after every statement. Returns the changeset of the transaction that just committed, or
   * `null` while a transaction is still open, when nothing changed, or when it rolled back.
   */
  collect(): Uint8Array | null;
}

const SQLITE_OK = 0;

function listTables(db: Database): string[] {
  const rows = db.exec({
    sql: "select name from sqlite_schema where type = 'table' and name not like 'sqlite_%' order by name",
    rowMode: "array",
    returnValue: "resultRows",
  }) as unknown[][];
  return rows.map((row) => String(row[0]));
}

function describeTable(db: Database, name: string): CapturedTable | null {
  const rows = db.exec({
    sql: "select name, type, pk from pragma_table_info(?)",
    bind: [name],
    rowMode: "object",
    returnValue: "resultRows",
  }) as unknown as CapturedColumn[];
  if (rows.length === 0) return null;
  const columns = rows.map((row) => ({
    name: String(row.name),
    type: String(row.type),
    pk: Number(row.pk),
  }));
  return { name, columns, tracked: columns.some((column) => column.pk > 0) };
}

export function createSessionCapture(sqlite3: Sqlite3Static, db: Database): SessionCapture {
  const { capi, wasm } = sqlite3;
  const dbPointer = db.pointer;
  if (dbPointer === undefined) throw new Error("[mobile-db] the database is closed");

  let session = 0;
  let attached: CaptureTables | null = null;
  let rolledBack = false;

  function check(code: number, step: string): void {
    if (code !== SQLITE_OK) throw new Error(`[mobile-db] change capture ${step} failed (${code})`);
  }

  function open(tables: CaptureTables): number {
    const stack = wasm.pstack.pointer;
    try {
      const out = wasm.pstack.allocPtr();
      check(capi.sqlite3session_create(dbPointer!, "main", out), "create");
      const created = Number(wasm.peekPtr(out));
      if (tables === "all") {
        check(capi.sqlite3session_attach(created, null), "attach");
      } else {
        for (const table of tables) check(capi.sqlite3session_attach(created, table), "attach");
      }
      return created;
    } finally {
      wasm.pstack.restore(stack);
    }
  }

  function close(): void {
    if (session !== 0) capi.sqlite3session_delete(session);
    session = 0;
  }

  function renew(): void {
    close();
    if (attached !== null) session = open(attached);
  }

  function read(): Uint8Array | null {
    const stack = wasm.pstack.pointer;
    try {
      const [sizeOut, bytesOut] = wasm.pstack.allocPtr(2);
      check(capi.sqlite3session_changeset(session, sizeOut!, bytesOut!), "changeset");
      const size = Number(wasm.peek32(sizeOut!));
      const pointer = Number(wasm.peekPtr(bytesOut!));
      if (pointer === 0) return null;
      const bytes = wasm.heap8u().slice(pointer, pointer + size);
      capi.sqlite3_free(pointer);
      return size > 0 ? bytes : null;
    } finally {
      wasm.pstack.restore(stack);
    }
  }

  return {
    start(tables) {
      close();
      attached = tables;
      rolledBack = false;
      capi.sqlite3_rollback_hook(
        dbPointer,
        () => {
          rolledBack = true;
          return 0;
        },
        0,
      );
      session = open(tables);
      const names = tables === "all" ? listTables(db) : tables;
      return names
        .map((name) => describeTable(db, name))
        .filter((table): table is CapturedTable => table !== null);
    },

    stop() {
      attached = null;
      close();
      capi.sqlite3_rollback_hook(dbPointer, 0, 0);
    },

    collect() {
      if (session === 0) return null;
      if (capi.sqlite3_get_autocommit(dbPointer) === 0) return null;
      if (rolledBack) {
        rolledBack = false;
        renew();
        return null;
      }
      if (capi.sqlite3session_isempty(session)) return null;
      const bytes = read();
      renew();
      return bytes;
    },
  };
}
