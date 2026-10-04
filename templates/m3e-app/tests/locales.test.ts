import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vite-plus/test";

/** Read raw: the app's i18n plugin compiles imported locale JSON into message functions. */
const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../src/locales/${name}.json`, import.meta.url), "utf8")) as Tree;
const en = load("en");
const fr = load("fr");
const ar = load("ar");

vi.mock("framework7-vue", () => ({ f7: undefined }));

const { fromDevice, pluralRule } = await import("../src/plugins/i18n.plugin.js");

type Tree = { [key: string]: string | Tree };

function strings(tree: Tree, path = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const here = path ? `${path}.${key}` : key;
    if (typeof value === "string") out.set(here, value);
    else for (const [k, v] of strings(value, here)) out.set(k, v);
  }
  return out;
}

const placeholders = (text: string) =>
  [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort().join();

describe("locales", () => {
  const source = strings(en);

  test.each([
    ["fr", fr],
    ["ar-DZ", ar],
  ])("%s has every English key, with its placeholders", (_, messages) => {
    const target = strings(messages);
    expect([...target.keys()].sort()).toEqual([...source.keys()].sort());
    for (const [key, text] of source) {
      expect(placeholders(target.get(key)!), key).toBe(placeholders(text));
    }
  });

  test("an Arabic plural carries all six forms", () => {
    for (const [key, text] of strings(ar)) {
      if (text.includes("|")) expect(text.split("|"), key).toHaveLength(6);
    }
  });
});

describe("Arabic plurals", () => {
  const pick = pluralRule("ar-DZ");
  test.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [10, 3],
    [11, 4],
    [99, 4],
    [100, 5],
    [102, 5],
  ])("%i takes form %i of six", (count, form) => {
    expect(pick(count, 6)).toBe(form);
  });
});

test("a device language finds its app locale whatever the region", () => {
  expect(fromDevice("ar")).toBe("ar-DZ");
  expect(fromDevice("ar-SA")).toBe("ar-DZ");
  expect(fromDevice("fr-DZ")).toBe("fr");
  expect(fromDevice("de")).toBeNull();
});
