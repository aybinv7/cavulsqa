import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "vite-plus/fmt";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { scaffold } from "../lib/scaffold.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const TEMPLATES = ["f7-app", "m3e-app"];

/** The templates' own `fmt.ignorePatterns`: declaration files a build rewrites. */
const IGNORED = new Set(["auto-imports.d.ts", "components.d.ts"]);

function* filesUnder(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else if (!IGNORED.has(entry.name)) yield path;
  }
}

/** Every file of a generated app, by its path in the app, with its contents. */
function contentsOf(app) {
  return new Map(
    [...filesUnder(app)].map((file) => [
      relative(app, file).replaceAll("\\", "/"),
      readFileSync(file, "utf8"),
    ]),
  );
}

/** The paths `vp fmt` would rewrite. Types it does not format are skipped, as there. */
async function unformatted(app, files) {
  const verdicts = await Promise.all(
    [...files].map(async ([path, source]) => {
      const { code, errors } = await format(join(app, path), source);
      if (errors.some((error) => error.message.startsWith("Unsupported file type"))) return null;
      return errors.length > 0 || code !== source ? path : null;
    }),
  );
  return verdicts.filter(Boolean);
}

/**
 * A generated app's first `vp check` has to pass. Every engine prunes different lines and the
 * updater rewrites `capacitor.config.ts`, `src/main.ts` and the manifest, so each choice is its own
 * app. The plain app is formatted whole once; each variant then only re-checks the files it
 * changed, because formatting every `.vue` file a dozen times is what made this slow, not thorough.
 */
describe.each(TEMPLATES)("%s", (templateName) => {
  const template = join(PACKAGE, "templates", templateName);
  const engines = JSON.parse(readFileSync(join(template, "package.json"), "utf8")).cavulsqa
    .storageEngines;
  const roots = [];

  function generate(options) {
    const out = join(mkdtempSync(join(tmpdir(), "cavulsqa-fmt-")), "app");
    roots.push(dirname(out));
    scaffold({
      templateDir: template,
      out,
      name: "caputa",
      appId: "com.example.caputa",
      appName: "Caputa",
      ...options,
    });
    return out;
  }

  let plain;
  let plainFiles;
  beforeAll(() => {
    plain = generate({});
    plainFiles = contentsOf(plain);
  });
  afterAll(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  test("with no choices, the app is already formatted", async () => {
    expect(await unformatted(plain, plainFiles)).toEqual([]);
  }, 60_000);

  test.each(engines)(
    "on %s with updates, the app is already formatted",
    async (engine) => {
      const app = generate({ engine, pragmas: "safe", updateUrl: "https://updates.example.com" });
      const changed = [...contentsOf(app)].filter(([path, text]) => plainFiles.get(path) !== text);

      expect(changed.map(([path]) => path)).toContain("src/app/storage.config.ts");
      expect(await unformatted(app, changed)).toEqual([]);
    },
    30_000,
  );
});
