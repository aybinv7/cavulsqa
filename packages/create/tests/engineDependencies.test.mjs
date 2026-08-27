import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";
import { catalog } from "../lib/catalog.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));

function templates() {
  const dir = join(ROOT, "templates");
  return readdirSync(dir)
    .map((name) => ({ name, manifest: join(dir, name, "package.json") }))
    .filter((entry) => existsSync(entry.manifest))
    .map((entry) => ({ name: entry.name, pkg: JSON.parse(readFileSync(entry.manifest, "utf8")) }));
}

const engineDependencies = (pkg) => [
  ...new Set(
    Object.values(pkg.cavulsqa?.engineModules ?? {}).flatMap((module) => module.dependencies ?? []),
  ),
];

/**
 * An engine library has to resolve to one version across the workspace.
 *
 * The template once pinned `@capacitor-community/sqlite@^7.0.1` while `mobile-db` declared the peer
 * as `>=7` and resolved 8. pnpm installed both, and the two copies' `SQLiteDBConnection` types would
 * not assign to each other - the same failure a duplicate Vue produced earlier, and it only shows up
 * after an install rather than in any diff.
 */
test("every engine dependency a template declares comes from the catalog", () => {
  const ranges = catalog(ROOT);
  const offenders = [];

  for (const { name, pkg } of templates()) {
    for (const dep of engineDependencies(pkg)) {
      const declared = pkg.dependencies?.[dep] ?? pkg.devDependencies?.[dep];
      if (declared !== "catalog:") {
        offenders.push(`${name} pins ${dep} as "${declared}" instead of "catalog:"`);
      } else if (!ranges.has(dep)) {
        offenders.push(`${name} asks for ${dep} from the catalog, which omits it`);
      }
    }
  }

  expect(offenders, offenders.join("\n")).toEqual([]);
});

/**
 * A dependency a template installs for an engine has to be one the library actually admits, or the
 * generated app installs something `mobile-db` will not accept.
 */
test("every engine dependency is a peer @cavulsqa/mobile-db declares", () => {
  const peers = JSON.parse(
    readFileSync(join(ROOT, "packages", "mobile-db", "package.json"), "utf8"),
  ).peerDependencies;

  const unknown = [];
  for (const { name, pkg } of templates()) {
    for (const dep of engineDependencies(pkg)) {
      if (!peers[dep]) unknown.push(`${name} installs ${dep}, which mobile-db does not declare`);
    }
  }

  expect(unknown, unknown.join("\n")).toEqual([]);
});

/**
 * A peer nobody imports is a question every consumer has to answer for nothing. `mobile-db` carried
 * `capacitor-sqlite-kysely` long after the code stopped using it.
 */
test("every peer @cavulsqa/mobile-db declares is imported by its source", () => {
  const dir = join(ROOT, "packages", "mobile-db");
  const peers = Object.keys(
    JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).peerDependencies,
  );

  const sources = [];
  const walk = (from) => {
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const full = join(from, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) sources.push(readFileSync(full, "utf8"));
    }
  };
  walk(join(dir, "src"));
  const all = sources.join("\n");

  // A subpath counts: sql.js is only ever imported as "sql.js/dist/sql-asm.js".
  const unused = peers.filter((peer) => !all.includes(`"${peer}"`) && !all.includes(`"${peer}/`));
  expect(unused, `unused peers: ${unused.join(", ")}`).toEqual([]);
});
