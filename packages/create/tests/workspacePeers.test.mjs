import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));
const PACKAGES = join(ROOT, "packages");

function manifests() {
  const found = new Map();
  for (const name of readdirSync(PACKAGES)) {
    const path = join(PACKAGES, name, "package.json");
    if (existsSync(path)) {
      const pkg = JSON.parse(readFileSync(path, "utf8"));
      if (!pkg.private) found.set(pkg.name, pkg);
    }
  }
  return found;
}

/**
 * A version bump has to carry the sibling ranges with it.
 *
 * `reactive-vue` went to 0.3.0 while still declaring `peer reactive-db@^0.2.0`, and nothing in this
 * repo noticed: every package resolves its siblings through the workspace, so the stale range only
 * surfaced when a real consumer installed both and pnpm reported an unmet peer.
 */
test("every peer range on a sibling package admits that sibling's current version", () => {
  const packages = manifests();
  expect(packages.size).toBeGreaterThan(1);

  const stale = [];
  for (const [name, pkg] of packages) {
    for (const [peer, range] of Object.entries(pkg.peerDependencies ?? {})) {
      const sibling = packages.get(peer);
      if (!sibling) continue;

      // Caret on a 0.x pins the minor, which is what makes this easy to get wrong.
      const [major, minor] = sibling.version.split(".");
      const wanted = major === "0" ? `^${major}.${minor}.0` : `^${major}.0.0`;
      if (range !== wanted) {
        stale.push(`${name} declares ${peer}@${range} but ${peer} is ${sibling.version}`);
      }
    }
  }

  expect(stale, stale.join("\n")).toEqual([]);
});
