#!/usr/bin/env node
/**
 * Generates a standalone app from a template in `templates/`.
 *
 * This is what `@cavulsqa/create` will call once it exists; keeping it as a script first means the
 * generation is reproducible and reviewable rather than a directory anyone copied by hand. Two
 * things have to happen for a copy of a workspace package to install on its own:
 *
 *   - `workspace:*` becomes the published version of that package, read from the workspace itself,
 *     so a generated app can never point at a version that was never released.
 *   - `catalog:` becomes the concrete range from `pnpm-workspace.yaml`. npm and a lone pnpm project
 *     resolve neither protocol.
 *
 * Usage:
 *   node tools/scaffold.mjs --name caputa --out ../caputa \
 *     [--template f7-app] [--app-id com.ayb.caputa] [--app-name Caputa]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Generated, installed or platform-specific: none of it belongs in a fresh app. */
const SKIP = new Set(["node_modules", "dist", "android", "ios", ".git", "pnpm-lock.yaml"]);

function args() {
  const parsed = new Map();
  for (let i = 2; i < process.argv.length; i += 2) {
    parsed.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
  }
  const name = parsed.get("name");
  const out = parsed.get("out");
  if (!name || !out) {
    console.error("usage: node tools/scaffold.mjs --name <app> --out <dir> [--template f7-app]");
    process.exit(1);
  }
  const titled = name.charAt(0).toUpperCase() + name.slice(1);
  return {
    name,
    out: resolve(ROOT, out),
    template: parsed.get("template") ?? "f7-app",
    appId: parsed.get("app-id") ?? `com.ayb.${name.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
    appName: parsed.get("app-name") ?? titled,
  };
}

/** The published version of each workspace package, so `workspace:*` resolves to something real. */
function workspaceVersions() {
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
  const lines = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8").split(/\r?\n/);
  const entries = new Map();
  let inside = false;
  for (const line of lines) {
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

function copyTree(from, to, transform) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    if (SKIP.has(entry)) continue;
    const source = join(from, entry);
    const target = join(to, entry);
    if (statSync(source).isDirectory()) {
      copyTree(source, target, transform);
      continue;
    }
    writeFileSync(target, transform(entry, readFileSync(source), source));
  }
}

const { name, out, template, appId, appName } = args();
const templateDir = join(ROOT, "templates", template);
if (!existsSync(templateDir)) throw new Error(`no template at ${templateDir}`);
if (existsSync(out)) throw new Error(`${out} already exists`);

const versions = workspaceVersions();
const ranges = catalog();

function resolveDeps(deps) {
  if (!deps) return undefined;
  const resolved = {};
  for (const [dep, range] of Object.entries(deps)) {
    if (range === "catalog:") {
      const pinned = ranges.get(dep);
      if (!pinned) throw new Error(`${dep} is "catalog:" but the catalog does not list it`);
      resolved[dep] = pinned;
    } else if (range.startsWith("workspace:")) {
      const published = versions.get(dep);
      if (!published) throw new Error(`${dep} is a workspace dependency but is not published`);
      resolved[dep] = `^${published}`;
    } else {
      resolved[dep] = range;
    }
  }
  return resolved;
}

function rewriteManifest(source) {
  const pkg = JSON.parse(source.toString("utf8"));
  return `${JSON.stringify(
    {
      ...pkg,
      name,
      version: "0.1.0",
      private: true,
      description: `${appName} - generated from @cavulsqa/template-${template}.`,
      dependencies: resolveDeps(pkg.dependencies),
      devDependencies: resolveDeps(pkg.devDependencies),
      engines: { node: ">=22.18.0" },
    },
    null,
    2,
  )}\n`;
}

copyTree(templateDir, out, (entry, source, path) => {
  if (entry === "package.json" && dirname(path) === templateDir) return rewriteManifest(source);

  const text = source.toString("utf8");
  if (entry === "capacitor.config.ts") {
    return text
      .replace(/appId: "[^"]*"/, `appId: "${appId}"`)
      .replace(/appName: "[^"]*"/, `appName: "${appName}"`);
  }
  if (entry === "vite.config.ts") {
    return text.replace(
      /__APP_NAME__: JSON\.stringify\("[^"]*"\)/,
      `__APP_NAME__: JSON.stringify("${appName}")`,
    );
  }
  if (entry === "index.html")
    return text.replace(/<title>[^<]*<\/title>/, `<title>${appName}</title>`);
  return source;
});

// The template relied on the workspace root for the ordinary ignores; on its own it needs them.
const ignore = join(out, ".gitignore");
writeFileSync(
  ignore,
  [
    "node_modules",
    "dist",
    "*.log",
    ".env",
    ".env.*",
    "!.env.example",
    ".DS_Store",
    "",
    "# Generated native projects. Recreate with `npx cap add android`.",
    "android",
    "ios",
    "",
    readFileSync(ignore, "utf8").trim(),
    "",
  ].join("\n"),
);

// pnpm refuses to finish an install while a dependency's build script is neither allowed nor
// denied, and vite-plus pulls esbuild in - so without this every generated app fails its very
// first `pnpm install` with ERR_PNPM_IGNORED_BUILDS.
writeFileSync(join(out, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");

writeFileSync(
  join(out, "README.md"),
  `# ${appName}

Generated from \`@cavulsqa/template-${template}\`.

\`\`\`bash
pnpm install
pnpm dev            # sql.js in memory, for inspecting the UI
npx cap add android # once, then: pnpm build && npx cap sync && npx cap run android
\`\`\`

\`CLAUDE.md\` and \`.claude/\` carry the architecture an agent needs before editing anything here.
`,
);

console.log(`${basename(out)} created at ${out}`);
console.log(`  appId ${appId} / appName ${appName}`);
for (const [dep, version] of versions) console.log(`  ${dep} -> ^${version}`);
