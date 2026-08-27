import { test, expect, vi } from "vite-plus/test";
import { createReactiveDb } from "../src/mutationProxy.js";

function makeBuilder(execResult: unknown): any {
  return {
    values: (..._args: any[]) => makeBuilder(execResult),
    set: (..._args: any[]) => makeBuilder(execResult),
    where: (..._args: any[]) => makeBuilder(execResult),
    execute: async () => execResult,
  };
}

function createStubDb(execResult: unknown = [{ id: 1 }]) {
  return {
    insertInto: (_table: string) => makeBuilder(execResult),
    updateTable: (_table: string) => makeBuilder(execResult),
    deleteFrom: (_table: string) => makeBuilder(execResult),
    selectFrom: (_table: string) => makeBuilder(execResult),
    transaction: () => ({
      execute: async (callback: any) => {
        const trxDb = createStubDb(execResult);
        return callback(trxDb);
      },
    }),
  };
}

test("insertInto emits an insert change event after execute resolves", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({ getDb: () => createStubDb([{ id: 1 }]) as any, emitChange });

  await rdb
    .insertInto("customer" as any)
    .values({ name: "Alice" } as any)
    .execute();

  expect(emitChange).toHaveBeenCalledWith("customer", "insert", { affectedRows: 1 });
});

test("updateTable emits an update change event with affectedRows from array result", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({
    getDb: () => createStubDb([{ id: 1 }, { id: 2 }]) as any,
    emitChange,
  });

  await rdb
    .updateTable("customer" as any)
    .set({ name: "Bob" } as any)
    .where("id", "=", 1)
    .execute();

  expect(emitChange).toHaveBeenCalledWith("customer", "update", { affectedRows: 2 });
});

test("deleteFrom emits a delete change event", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({ getDb: () => createStubDb() as any, emitChange });

  await rdb
    .deleteFrom("customer" as any)
    .where("id", "=", 1)
    .execute();

  expect(emitChange).toHaveBeenCalledWith("customer", "delete", { affectedRows: 1 });
});

test("selectFrom does not emit any change event", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({ getDb: () => createStubDb() as any, emitChange });

  await (rdb as any).selectFrom("customer").execute();

  expect(emitChange).not.toHaveBeenCalled();
});

test("transaction reports what it did per table, after commit", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({ getDb: () => createStubDb() as any, emitChange });

  await rdb.transaction().execute(async (trx: any) => {
    await (trx as any).insertInto("customer").values({}).execute();
    await (trx as any).updateTable("customer").set({}).where("id", "=", 1).execute();
    await (trx as any).insertInto("order").values({}).execute();
    expect(emitChange).not.toHaveBeenCalled();
  });

  // Reporting "bulk" for everything meant a query with refetchOn: ["insert"] ignored the whole
  // transaction - and transactions are where batched writes live.
  expect(emitChange).toHaveBeenCalledWith("customer", "insert");
  expect(emitChange).toHaveBeenCalledWith("customer", "update");
  expect(emitChange).toHaveBeenCalledWith("order", "insert");
  expect(emitChange).toHaveBeenCalledTimes(3);
});

test("a table written twice the same way is reported once", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({ getDb: () => createStubDb() as any, emitChange });

  await rdb.transaction().execute(async (trx: any) => {
    await (trx as any).insertInto("customer").values({}).execute();
    await (trx as any).insertInto("customer").values({}).execute();
  });

  expect(emitChange).toHaveBeenCalledTimes(1);
  expect(emitChange).toHaveBeenCalledWith("customer", "insert");
});

test("no event is emitted when the driver reports zero updated rows", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({
    getDb: () => createStubDb([{ numUpdatedRows: 0n }]) as any,
    emitChange,
  });

  await rdb
    .updateTable("customer" as any)
    .set({ name: "Alice" } as any)
    .where("id" as any, "=", 1)
    .execute();

  expect(emitChange).not.toHaveBeenCalled();
});

test("a real update still emits with its driver row count", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({
    getDb: () => createStubDb([{ numUpdatedRows: 3n }]) as any,
    emitChange,
  });

  await rdb
    .updateTable("customer" as any)
    .set({ name: "Alice" } as any)
    .execute();

  expect(emitChange).toHaveBeenCalledWith("customer", "update", { affectedRows: 3 });
});

test("an absent row count still emits, since the driver cannot prove zero", async () => {
  const emitChange = vi.fn();
  const rdb = createReactiveDb<any>({ getDb: () => createStubDb([]) as any, emitChange });

  await rdb
    .updateTable("customer" as any)
    .set({ name: "Alice" } as any)
    .execute();

  expect(emitChange).toHaveBeenCalledWith("customer", "update", undefined);
});
