import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));
const TEMPLATES = join(ROOT, "templates");

/**
 * `--engine` is offered from each template's manifest, because the generator runs without a
 * TypeScript compiler and used to regex the union out of the source at run time. Two
 * representations of one list is fine; disagreeing about it is not - a manifest listing an engine
 * the app does not implement writes a `.env` the app silently ignores.
 */
test("every template's declared engines are the ones its code implements", () => {
  const checked = [];

  for (const name of readdirSync(TEMPLATES)) {
    const types = join(TEMPLATES, name, "src/shared/database/candidates/types.ts");
    if (!existsSync(types)) continue;

    const block = /export const STORAGE_IDS = \[([\s\S]*?)\] as const;/.exec(
      readFileSync(types, "utf8"),
    );
    expect(block, `${name}: no STORAGE_IDS in candidates/types.ts`).toBeTruthy();

    const implemented = [...block[1].matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]);
    const pkg = JSON.parse(readFileSync(join(TEMPLATES, name, "package.json"), "utf8"));

    expect(implemented.length).toBeGreaterThan(0);
    expect(pkg.cavulsqa?.storageEngines).toEqual(implemented);
    checked.push(name);
  }

  expect(checked.length).toBeGreaterThan(0);
});
