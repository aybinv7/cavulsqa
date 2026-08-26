import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";
import { fingerprintTemplates } from "../lib/templateFingerprint.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));

/**
 * The creator bundles the templates when it is packed, so a template fix reaches nobody until a new
 * version of the creator is published. That coupling is invisible in a diff - the template commit
 * looks complete on its own - which is precisely why it needs a guard rather than a convention.
 */
test("the templates have not changed since @cavulsqa/create was last stamped", () => {
  const pkg = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));
  const current = fingerprintTemplates(join(ROOT, "templates"));

  expect(
    current,
    `the templates changed but @cavulsqa/create@${pkg.version} would still ship the old ones.\n` +
      `Run: pnpm --filter @cavulsqa/create run stamp [patch|minor|major]`,
  ).toBe(pkg.templatesFingerprint);
});
