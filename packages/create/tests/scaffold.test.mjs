import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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
    appId: "com.sig.caputa",
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
  expect(read("capacitor.config.ts")).toContain('appId: "com.sig.caputa"');
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

test("it refuses to write over an existing directory", () => {
  const app = generate();
  expect(() =>
    scaffold({ templateDir: TEMPLATE, out: app, name: "x", appId: "a.b", appName: "X" }),
  ).toThrow(/already exists/);
});
