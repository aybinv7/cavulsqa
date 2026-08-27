import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Every publishable package under `packages/`, mapped to the version it currently declares. */
export function publishedVersions(repoRoot) {
  const versions = new Map();
  for (const dir of readdirSync(join(repoRoot, "packages")).sort()) {
    const manifest = join(repoRoot, "packages", dir, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    if (!pkg.private) versions.set(pkg.name, pkg.version);
  }
  return versions;
}

/**
 * The sibling packages the templates declare as `workspace:` deps, in the order they are named.
 *
 * These are the ones the bundler rewrites to a concrete `^` range, so they are the ones whose
 * versions change what a published creator scaffolds.
 */
export function workspaceDependencies(repoRoot) {
  const names = new Set();
  const templates = join(repoRoot, "templates");
  if (!existsSync(templates)) return [];

  for (const name of readdirSync(templates).sort()) {
    const manifest = join(templates, name, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    for (const group of [pkg.dependencies, pkg.devDependencies]) {
      for (const [dep, range] of Object.entries(group ?? {})) {
        if (typeof range === "string" && range.startsWith("workspace:")) names.add(dep);
      }
    }
  }
  // Codepoint order, not locale order: this list is hashed, and the hash has to match on every
  // machine that computes it.
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
