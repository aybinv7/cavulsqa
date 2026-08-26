#!/usr/bin/env node
/**
 * Copies `templates/*` into this package and resolves the workspace protocols while doing it.
 *
 * The resolution has to happen here, at publish time, rather than when someone generates an app:
 * `workspace:*` and `catalog:` only mean something inside this repository, and the published
 * package has neither a workspace nor a catalog to consult. Resolving now also pins each generated
 * app to the package versions that existed when the creator was published, which is what makes
 * `@cavulsqa/create@x` a reproducible thing rather than a moving target.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));
const OUT = join(PACKAGE, "templates");

/** Generated, installed or platform-specific: none of it belongs in a published template. */
const SKIP = new Set(["node_modules", "dist", "android", "ios", ".git", "pnpm-lock.yaml"]);

function publishedVersions() {
  const versions = new Map();
  for (const dir of readdirSync(join(ROOT, "packages"))) {
    const manifest = join(ROOT, "packages", dir, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    if (!pkg.private) versions.set(pkg.name, pkg.version);
  }
  return versions;
}

/** A deliberately small reader: the catalog is a flat block of `name: range` and nothing else. */
function catalog() {
  const entries = new Map();
  let inside = false;
  for (const line of readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8").split(/\r?\n/)) {
    if (/^catalog:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (inside && /^\S/.test(line)) break;
    if (!inside) continue;
    const match = /^\s+"?([^":]+)"?:\s*(.+?)\s*$/.exec(line);
    if (match) entries.set(match[1], match[2].replace(/^["']|["']$/g, ""));
  }
  return entries;
}

const versions = publishedVersions();
const ranges = catalog();

function resolveDeps(deps, template) {
  if (!deps) return undefined;
  const resolved = {};
  for (const [dep, range] of Object.entries(deps)) {
    if (range === "catalog:") {
      const pinned = ranges.get(dep);
      if (!pinned) throw new Error(`${template}: ${dep} is "catalog:" but the catalog omits it`);
      resolved[dep] = pinned;
    } else if (range.startsWith("workspace:")) {
      const published = versions.get(dep);
      if (!published) throw new Error(`${template}: ${dep} is a workspace dep but is unpublished`);
      resolved[dep] = `^${published}`;
    } else {
      resolved[dep] = range;
    }
  }
  return resolved;
}

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, target);
    else cpSync(source, target);
  }
}

rmSync(OUT, { recursive: true, force: true });

const bundled = [];
for (const name of readdirSync(join(ROOT, "templates"))) {
  const from = join(ROOT, "templates", name);
  if (!existsSync(join(from, "package.json"))) continue;

  const to = join(OUT, name);
  copyTree(from, to);

  const manifestPath = join(to, "package.json");
  const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
  // `private` and the workspace-only name are dropped by the generator, which renames the app.
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        ...pkg,
        dependencies: resolveDeps(pkg.dependencies, name),
        devDependencies: resolveDeps(pkg.devDependencies, name),
      },
      null,
      2,
    )}\n`,
  );

  bundled.push(name);
}

if (!bundled.length) throw new Error("no templates were bundled");
console.log(`bundled ${bundled.join(", ")}`);
for (const [dep, version] of versions) console.log(`  ${dep} pinned to ^${version}`);
