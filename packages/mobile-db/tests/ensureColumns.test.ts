import { test, expect } from "vite-plus/test";
import { ensureColumns } from "../src/ensureColumns.js";

function createMockDb() {
  const added: Array<{ table: string; column: string }> = [];

  return {
    _added: added,
    schema: {
      alterTable: (table: string) => ({
        addColumn: (name: string, _type: any, configure?: (col: any) => any) => {
          if (configure) configure({} as any);
          return {
            execute: async () => {
              added.push({ table, column: name });
            },
          };
        },
      }),
    },
  } as any;
}

test("adds a column when it is missing from the table", async () => {
  const db = createMockDb();
  await ensureColumns(
    db,
    [{ table: "users", columns: [{ name: "email", type: "text" }] }],
    async () => ["id", "name"],
  );
  expect(db._added).toEqual([{ table: "users", column: "email" }]);
});

test("skips columns that already exist", async () => {
  const db = createMockDb();
  await ensureColumns(
    db,
    [{ table: "users", columns: [{ name: "email", type: "text" }] }],
    async () => ["id", "name", "email"],
  );
  expect(db._added).toEqual([]);
});

test("handles multiple tables and columns", async () => {
  const db = createMockDb();
  const columnsByTable: Record<string, string[]> = { users: ["id"], orders: ["id", "total"] };
  await ensureColumns(
    db,
    [
      {
        table: "users",
        columns: [
          { name: "name", type: "text" },
          { name: "email", type: "text" },
        ],
      },
      { table: "orders", columns: [{ name: "status", type: "text" }] },
    ],
    async (table: string) => columnsByTable[table] ?? [],
  );
  expect(db._added).toEqual([
    { table: "users", column: "name" },
    { table: "users", column: "email" },
    { table: "orders", column: "status" },
  ]);
});

test("applies configure callback when adding a column", async () => {
  const db = createMockDb();
  let configured = false;
  await ensureColumns(
    db,
    [
      {
        table: "users",
        columns: [
          {
            name: "score",
            type: "integer",
            configure: (col: any) => {
              configured = true;
              return col;
            },
          },
        ],
      },
    ],
    async () => ["id"],
  );
  expect(configured).toBe(true);
  expect(db._added).toEqual([{ table: "users", column: "score" }]);
});

test("propagates errors from ALTER TABLE (does not swallow)", async () => {
  const db = {
    schema: {
      alterTable: (_table: string) => ({
        addColumn: () => ({
          execute: async () => {
            throw new Error("real failure");
          },
        }),
      }),
    },
  } as any;

  await expect(
    ensureColumns(db, [{ table: "users", columns: [{ name: "x", type: "text" }] }], async () => []),
  ).rejects.toThrow("real failure");
});

test("works with an empty column list", async () => {
  const db = createMockDb();
  await ensureColumns(db, [{ table: "users", columns: [] }], async () => ["id"]);
  expect(db._added).toEqual([]);
});
