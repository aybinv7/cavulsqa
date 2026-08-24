import { test, expect } from "vite-plus/test";
import { createChangeBus, type TableChangeEvent } from "../src/events.js";

test("notifies a listener when one of its tables changes", () => {
  const bus = createChangeBus();
  const seen: string[] = [];
  bus.on(["res_partner"], (e: TableChangeEvent) => seen.push(`${e.table}:${e.type}`));
  bus.emit("res_partner", "insert");
  expect(seen).toEqual(["res_partner:insert"]);
});

test("does not notify a listener for an unrelated table", () => {
  const bus = createChangeBus();
  const seen: string[] = [];
  bus.on(["res_partner"], () => seen.push("x"));
  bus.emit("product_product", "update");
  expect(seen).toEqual([]);
});

test("a wildcard listener receives every table change", () => {
  const bus = createChangeBus();
  const seen: string[] = [];
  bus.on(["*"], (e: TableChangeEvent) => seen.push(e.table));
  bus.emit("a", "insert");
  bus.emit("b", "delete");
  expect(seen).toEqual(["a", "b"]);
});

test("carries optional granular metadata (affectedIds, transactionId) through to listeners", () => {
  const bus = createChangeBus();
  let received: { affectedIds?: (string | number)[]; transactionId?: string } = {};
  bus.on(["sale_order"], (e: TableChangeEvent) => {
    received = { affectedIds: e.affectedIds, transactionId: e.transactionId };
  });
  bus.emit("sale_order", "update", { affectedIds: [7, 9], transactionId: "tx-1" });
  expect(received).toEqual({ affectedIds: [7, 9], transactionId: "tx-1" });
});

test("unsubscribe stops further notifications", () => {
  const bus = createChangeBus();
  const seen: string[] = [];
  const off = bus.on(["a"], () => seen.push("x"));
  bus.emit("a", "insert");
  off();
  bus.emit("a", "insert");
  expect(seen).toEqual(["x"]);
});
