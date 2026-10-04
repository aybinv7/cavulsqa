import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_TEMPLATES = join(dirname(dirname(PACKAGE)), "templates");
const manifest = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));

const PACKAGE_OF = { "happy-dom": "happy-dom", jsdom: "jsdom" };
const DIRECTIVE = /@vitest-environment\s+([\w-]+)/g;

function testFiles(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.test\.[cm]?[jt]s$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Inside the workspace a template's tests find `happy-dom` through a sibling package; a generated app
 * has only what its own manifest declares. `m3e-app` 2.10.0 shipped a test needing `happy-dom`
 * without declaring it, and the first sign was the generated app's test step failing on npm.
 */
test("every test environment a template's tests ask for is one of its own dependencies", () => {
  for (const { name } of manifest.createConfig.templates) {
    const root = join(REPO_TEMPLATES, name);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const declared = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
    for (const file of testFiles(join(root, "tests"))) {
      for (const [, environment] of readFileSync(file, "utf8").matchAll(DIRECTIVE)) {
        const needed = PACKAGE_OF[environment];
        if (needed) expect(declared.has(needed), `${name}: ${file} needs ${needed}`).toBe(true);
      }
    }
  }
});
