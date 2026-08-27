import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vite-plus/test";
import { scaffold } from "../lib/scaffold.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const TEMPLATE = join(PACKAGE, "templates", "f7-app");

let out;
afterEach(() => {
  if (out) rmSync(out, { recursive: true, force: true });
  out = undefined;
});

function generate(engine) {
  out = join(mkdtempSync(join(tmpdir(), "cavulsqa-prune-")), "app");
  scaffold({
    templateDir: TEMPLATE,
    out,
    name: "caputa",
    appId: "com.example.caputa",
    appName: "Caputa",
    engine,
  });
  return out;
}

const modules = () =>
  JSON.parse(readFileSync(join(TEMPLATE, "package.json"), "utf8")).cavulsqa.engineModules;

const read = (dir, file) => readFileSync(join(dir, file), "utf8");
const manifestOf = (dir) => JSON.parse(read(dir, "package.json"));

/**
 * The choice has to be real, not cosmetic. One template means one `package.json`, so before the
 * pruner an app generated on OPFS still installed the Capacitor plugin - and shipped it in the APK
 * - for a candidate it would never reach.
 */
test("choosing an engine removes the other engines' dependencies", () => {
  const dir = generate("sqlite-wasm-opfs-sahpool");
  const deps = manifestOf(dir).dependencies;

  expect(deps["@sqlite.org/sqlite-wasm"]).toBeDefined();
  expect(deps["@capacitor-community/sqlite"]).toBeUndefined();
  expect(deps["wa-sqlite"]).toBeUndefined();
});

test("choosing the native engine removes the wasm engines' dependencies", () => {
  const dir = generate("capacitor-sqlite");
  const deps = manifestOf(dir).dependencies;

  expect(deps["@capacitor-community/sqlite"]).toBeDefined();
  expect(deps["@sqlite.org/sqlite-wasm"]).toBeUndefined();
  expect(deps["wa-sqlite"]).toBeUndefined();
});

test("a dropped engine leaves no file behind and nothing importing it", () => {
  const dir = generate("capacitor-sqlite");

  for (const [name, module] of Object.entries(modules())) {
    const survives = name === "capacitorSqlite";
    expect(existsSync(join(dir, module.file)), module.file).toBe(survives);
  }

  // A deleted file that something still imports is worse than not pruning at all: the app does not
  // compile, and the failure names a module rather than the engine choice that caused it.
  const barrel = read(dir, "src/shared/database/candidates/index.ts");
  const config = read(dir, "src/app/storage.config.ts");
  for (const [name, module] of Object.entries(modules())) {
    if (name === "capacitorSqlite") continue;
    expect(barrel).not.toContain(module.file.split("/").pop().replace(/\.ts$/, ""));
    for (const symbol of module.exports) expect(config).not.toContain(symbol);
  }
});

test("a dropped engine is no longer offered as a storage id", () => {
  const dir = generate("sqlite-wasm-opfs-sahpool");
  const types = read(dir, "src/shared/database/candidates/types.ts");

  expect(types).toContain('"sqlite-wasm-opfs-sahpool"');
  expect(types).not.toContain('"capacitor-sqlite"');
  expect(types).not.toContain('"wa-sqlite-access-handle-pool"');
});

test("the chosen engine survives in every place that names it", () => {
  const dir = generate("wa-sqlite-idb-batch-atomic");

  expect(read(dir, "src/shared/database/candidates/types.ts")).toContain(
    '"wa-sqlite-idb-batch-atomic"',
  );
  expect(read(dir, "src/shared/database/candidates/index.ts")).toContain("waSqlite");
  expect(read(dir, "src/app/storage.config.ts")).toContain("waIdbBatchAtomic");
  expect(manifestOf(dir).dependencies["wa-sqlite"]).toBeDefined();
  expect(read(dir, ".env")).toContain("VITE_STORAGE_ENGINE=wa-sqlite-idb-batch-atomic");
});

test("generating without an engine keeps every engine", () => {
  out = join(mkdtempSync(join(tmpdir(), "cavulsqa-prune-")), "app");
  scaffold({
    templateDir: TEMPLATE,
    out,
    name: "caputa",
    appId: "com.example.caputa",
    appName: "Caputa",
  });

  const deps = manifestOf(out).dependencies;
  expect(deps["@sqlite.org/sqlite-wasm"]).toBeDefined();
  expect(deps["wa-sqlite"]).toBeDefined();
  expect(deps["@capacitor-community/sqlite"]).toBeDefined();
});

test("every engine the template offers belongs to exactly one module", () => {
  const declared = JSON.parse(readFileSync(join(TEMPLATE, "package.json"), "utf8")).cavulsqa
    .storageEngines;
  const owned = Object.values(modules()).flatMap((module) => module.engines);

  const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  expect([...owned].sort(byName)).toEqual([...declared].sort(byName));
});
