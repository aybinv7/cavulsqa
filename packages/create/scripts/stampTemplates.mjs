#!/usr/bin/env node
/**
 * Records the current template fingerprint and bumps this package's version, which is the one
 * action that actually ships a template change to anybody.
 *
 * Run it after editing a template:  pnpm --filter @cavulsqa/create run stamp [patch|minor|major]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprintTemplates } from "../lib/templateFingerprint.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));

const release = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(release)) {
  console.error(`unknown release "${release}"; expected patch, minor or major`);
  process.exit(1);
}

const manifestPath = join(PACKAGE, "package.json");
const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));

const fingerprint = fingerprintTemplates(ROOT);
const unchanged = pkg.templatesFingerprint === fingerprint;

const [major, minor, patch] = pkg.version.split(".").map(Number);
const next = {
  major: `${major + 1}.0.0`,
  minor: `${major}.${minor + 1}.0`,
  patch: `${major}.${minor}.${patch + 1}`,
}[release];

if (unchanged) {
  console.log(`templates unchanged; @cavulsqa/create stays at ${pkg.version}`);
  process.exit(0);
}

writeFileSync(
  manifestPath,
  `${JSON.stringify({ ...pkg, version: next, templatesFingerprint: fingerprint }, null, 2)}\n`,
);

console.log(`@cavulsqa/create ${pkg.version} -> ${next}`);
console.log(`  templates ${fingerprint}`);
