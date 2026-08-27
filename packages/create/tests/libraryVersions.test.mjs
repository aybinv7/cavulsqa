import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";
import { publishedVersions, workspaceDependencies } from "../lib/publishedVersions.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PACKAGE));

/**
 * The libraries release as one version, and that is a decision rather than a coincidence.
 *
 * A caret range on a `0.x` pins the minor, so `^0.3.0` already refused `0.4.0`: consumers had to
 * move all three together on every release while reading three different numbers to work out which
 * combination was current. One number for the set says the same thing and is checkable.
 *
 * The creator is deliberately not in this set. Its version tracks template changes through the
 * recorded fingerprint, on its own cadence, and tying it to the libraries would make it mean
 * nothing.
 */
test("every library the templates depend on publishes at the same version", () => {
  const versions = publishedVersions(ROOT);
  const libraries = workspaceDependencies(ROOT);

  expect(libraries.length).toBeGreaterThan(1);

  const declared = new Map(libraries.map((name) => [name, versions.get(name)]));
  const distinct = new Set(declared.values());

  expect(
    [...distinct],
    `the libraries disagree:\n${[...declared].map(([n, v]) => `  ${n} ${v}`).join("\n")}`,
  ).toHaveLength(1);
});

test("the libraries are past 0.x, so a minor release is not a wall for consumers", () => {
  const versions = publishedVersions(ROOT);

  for (const name of workspaceDependencies(ROOT)) {
    const version = versions.get(name);
    expect(Number(version.split(".")[0]), `${name} is ${version}`).toBeGreaterThanOrEqual(1);
  }
});
