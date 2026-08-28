import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Generated, installed or platform-specific: none of it belongs in a template.
 *
 * Only consulted when git cannot answer - a bundled template carries no repository.
 */
const SKIP = new Set(["node_modules", "dist", "android", "ios", ".git", "pnpm-lock.yaml"]);

/**
 * The files a template consists of, as paths relative to `dir`.
 *
 * Asks git first, and falls back to walking only when git cannot answer. A name blocklist is the
 * wrong instrument for a working copy: it lets through anything nobody thought to name, and a
 * maintainer's stray `build/` and a deploy log both reached a generated app that way. Git already
 * knows what belongs - it is the same list the template fingerprint is computed from, so what ships
 * and what is hashed cannot drift apart.
 */
export function listTemplateFiles(dir) {
  const tracked = trackedFiles(dir);
  return tracked ?? walk(dir, dir);
}

function trackedFiles(dir) {
  if (!existsSync(join(dir, ".git")) && !insideRepository(dir)) return null;
  try {
    const listing = execFileSync("git", ["ls-files", "-z"], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const files = listing
      .split("\0")
      .filter(Boolean)
      .map((file) => file.split("/").join(sep));
    return files.length ? files.filter((file) => !SKIP.has(file.split(sep)[0])) : null;
  } catch {
    return null;
  }
}

function insideRepository(dir) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function walk(root, dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(root, full));
    else found.push(relative(root, full));
  }
  return found;
}
