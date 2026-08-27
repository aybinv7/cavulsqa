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

function generate(options = {}) {
  out = join(mkdtempSync(join(tmpdir(), "cavulsqa-")), "app");
  scaffold({
    templateDir: TEMPLATE,
    out,
    name: "caputa",
    appId: "com.example.caputa",
    appName: "Caputa",
    ...options,
  });
  return out;
}

/**
 * npm resolves neither protocol, so one surviving into a generated manifest is not a warning - it
 * is an app nobody can install. The bundling step is what resolves them; this proves it ran.
 */
test("no workspace or catalog protocol survives into the generated manifest", () => {
  const pkg = JSON.parse(readFileSync(join(generate(), "package.json"), "utf8"));
  const ranges = Object.values({ ...pkg.dependencies, ...pkg.devDependencies });

  expect(ranges.length).toBeGreaterThan(10);
  expect(ranges.filter((range) => /^(workspace:|catalog:)/.test(range))).toEqual([]);
  expect(pkg.dependencies["@cavulsqa/mobile-db"]).toMatch(/^\^\d+\.\d+\.\d+$/);
});

test("the app is renamed everywhere its identity appears", () => {
  const app = generate();
  const read = (file) => readFileSync(join(app, file), "utf8");

  expect(JSON.parse(read("package.json")).name).toBe("caputa");
  expect(read("capacitor.config.ts")).toContain('appId: "com.example.caputa"');
  expect(read("capacitor.config.ts")).toContain('appName: "Caputa"');
  expect(read("vite.config.ts")).toContain('__APP_NAME__: JSON.stringify("Caputa")');
  expect(read("index.html")).toContain("<title>Caputa</title>");
});

test("the generated app can install and can be opened by an agent", () => {
  const app = generate();

  // Without this decision pnpm stops the very first install on ERR_PNPM_IGNORED_BUILDS.
  expect(readFileSync(join(app, "pnpm-workspace.yaml"), "utf8")).toContain("esbuild: true");
  // The declarations vue-tsc needs, and the instructions an agent needs, both have to survive.
  expect(() => readFileSync(join(app, "auto-imports.d.ts"))).not.toThrow();
  expect(readFileSync(join(app, "CLAUDE.md"), "utf8")).toContain("SQLite is the source of truth");
});

test("an engine choice becomes a .env the app actually reads", () => {
  const app = generate({ engine: "wa-sqlite-idb-batch-atomic", pragmas: "fast" });
  const env = readFileSync(join(app, ".env"), "utf8");

  expect(env).toContain("VITE_STORAGE_ENGINE=wa-sqlite-idb-batch-atomic");
  expect(env).toContain("VITE_PRAGMA_PROFILE=fast");

  // The name has to match what the config looks for, or the file is written and ignored.
  const config = readFileSync(join(app, "src/app/storage.config.ts"), "utf8");
  expect(config).toContain("import.meta.env.VITE_STORAGE_ENGINE");

  // And the documented template travels with it.
  expect(readFileSync(join(app, ".env.example"), "utf8")).toContain("VITE_STORAGE_ENGINE");
});

test("no .env is written when nothing was chosen", () => {
  const app = generate();
  expect(() => readFileSync(join(app, ".env"))).toThrow();
});

test("it refuses to write over an existing directory", () => {
  const app = generate();
  expect(() =>
    scaffold({ templateDir: TEMPLATE, out: app, name: "x", appId: "a.b", appName: "X" }),
  ).toThrow(/already exists/);
});

/**
 * `--from` points at a live working copy, which has `node_modules` in it - and that is full of
 * directory symlinks, which `readdirSync(..., {withFileTypes: true})` reports as files and
 * `readFileSync` then rejects with EISDIR. Generating from a source template failed outright.
 */
test("generating from a live template skips what is installed or generated", () => {
  const source = join(dirname(dirname(PACKAGE)), "templates", "f7-app");
  const generated = generate({ templateDir: source });

  for (const unwanted of ["node_modules", "dist", "android", "ios", "pnpm-lock.yaml"]) {
    expect(existsSync(join(generated, unwanted)), unwanted).toBe(false);
  }
  // It still produced a usable app rather than an empty directory.
  expect(existsSync(join(generated, "src/main.ts"))).toBe(true);
  expect(existsSync(join(generated, "package.json"))).toBe(true);
});
