import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The workspace catalog, as a flat map of `name` to range.
 *
 * A deliberately small reader: the catalog is a block of `name: range` and nothing else.
 */
export function catalog(repoRoot) {
  const entries = new Map();
  let inside = false;
  for (const line of readFileSync(join(repoRoot, "pnpm-workspace.yaml"), "utf8").split(/\r?\n/)) {
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
