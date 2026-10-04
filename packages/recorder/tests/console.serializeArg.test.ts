import { expect, test } from "vite-plus/test";
import {
  MAX_ARG_PROPERTIES,
  MAX_ARG_TEXT,
  serializeArg,
  truncateText,
} from "../src/tracks/console/serializeArg.js";

test("primitives serialize as text", () => {
  expect(serializeArg("hi")).toEqual({ kind: "primitive", text: "hi" });
  expect(serializeArg(42)).toEqual({ kind: "primitive", text: "42" });
  expect(serializeArg(true)).toEqual({ kind: "primitive", text: "true" });
  expect(serializeArg(undefined)).toEqual({ kind: "primitive", text: "undefined" });
  expect(serializeArg(10n)).toEqual({ kind: "primitive", text: "10n" });
});

test("truncateText caps at MAX_ARG_TEXT and ends with an ellipsis", () => {
  const long = "x".repeat(MAX_ARG_TEXT + 100);
  const truncated = truncateText(long);
  expect(truncated.length).toBe(MAX_ARG_TEXT);
  expect(truncated.endsWith("…")).toBe(true);
});

test("an object with 200 keys yields overflow: true and exactly 64 properties", () => {
  const value: Record<string, number> = {};
  for (let i = 0; i < 200; i++) value[`key${i}`] = i;

  const record = serializeArg(value);
  if (record.kind !== "object") throw new Error("expected object record");
  expect(record.overflow).toBe(true);
  expect(record.properties).toHaveLength(MAX_ARG_PROPERTIES);
});

test("depth is capped at 3 levels; deeper levels become overflow markers", () => {
  const value = { a: { b: { c: { d: { e: 1 } } } } };
  const record = serializeArg(value);
  if (record.kind !== "object") throw new Error("expected object record");

  const a = record.properties[0]!.value;
  if (a.kind !== "object") throw new Error("expected object record");
  const b = a.properties[0]!.value;
  if (b.kind !== "object") throw new Error("expected object record");
  const c = b.properties[0]!.value;
  if (c.kind !== "object") throw new Error("expected object record");

  expect(c.overflow).toBe(true);
  expect(c.properties).toHaveLength(0);
});

test("cyclic objects serialize as [Circular] instead of looping forever", () => {
  const value: Record<string, unknown> = { name: "loop" };
  value.self = value;

  const record = serializeArg(value);
  if (record.kind !== "object") throw new Error("expected object record");
  const self = record.properties.find((p) => p.name === "self")!.value;
  expect(self).toEqual({
    kind: "object",
    description: "[Circular]",
    subtype: null,
    properties: [],
    overflow: false,
  });
});

test("Error becomes 'Name: message' with a stack property", () => {
  const err = new Error("boom");
  err.name = "CustomError";
  const record = serializeArg(err);
  if (record.kind !== "object") throw new Error("expected object record");

  expect(record.description).toBe("CustomError: boom");
  expect(record.subtype).toBe("error");
  const stackProp = record.properties.find((p) => p.name === "stack");
  expect(stackProp).toBeDefined();
  expect(stackProp!.value.kind).toBe("primitive");
});

test("arrays, dates, maps, sets and null get their expected subtype", () => {
  expect(serializeArg([1, 2, 3])).toMatchObject({ subtype: "array", description: "Array(3)" });
  expect(serializeArg(new Date(0))).toMatchObject({ subtype: "date" });
  expect(serializeArg(new Map([["a", 1]]))).toMatchObject({
    subtype: "map",
    description: "Map(1)",
  });
  expect(serializeArg(new Set([1, 2]))).toMatchObject({ subtype: "set", description: "Set(2)" });
  expect(serializeArg(null)).toMatchObject({ subtype: "null", description: "null" });
});

test("plain objects get a null subtype", () => {
  const record = serializeArg({ a: 1 });
  if (record.kind !== "object") throw new Error("expected object record");
  expect(record.subtype).toBeNull();
});
