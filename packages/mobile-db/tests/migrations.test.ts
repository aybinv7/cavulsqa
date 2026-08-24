import { test, expect } from "vite-plus/test";
import { composeMigrations } from "../src/migrations.js";

const noop = { up: async () => {}, down: async () => {} };

test("merges ordered migration sets into a single record", () => {
  const merged = composeMigrations([
    { "001_core": noop },
    { "002_partner": noop, "003_product": noop },
  ]);
  expect(Object.keys(merged)).toEqual(["001_core", "002_partner", "003_product"]);
});

test("returns an empty record for no sets", () => {
  expect(composeMigrations([])).toEqual({});
});

test("throws on a duplicate migration name across sets, naming the collision", () => {
  expect(() => composeMigrations([{ "001_core": noop }, { "001_core": noop }])).toThrow("001_core");
});
