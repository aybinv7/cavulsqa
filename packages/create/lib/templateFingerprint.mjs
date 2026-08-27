import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { publishedVersions, workspaceDependencies } from "./publishedVersions.mjs";

/**
 * A content hash of everything a published creator would bundle, used to prove that
 * `@cavulsqa/create` was republished after any of it changed.
 *
 * The creator bundles the templates at pack time, so a template fix reaches nobody until a new
 * version of the creator goes out. Nothing about that is visible in a diff, which is exactly the
 * kind of coupling that gets forgotten - so it is checked rather than remembered.
 *
 * Two inputs, because the bundle has two:
 *
 *   - The tracked files under `templates/`. It asks git rather than walking the directory. Walking
 *     gave two different answers on a Windows working copy and on a CI checkout, because the disk
 *     holds whatever each machine happens to have: ignored files, build leftovers, and CRLF where
 *     the runner has LF. `git ls-files -s` reports the blob hash recorded in the index, which is
 *     normalised, platform-independent, and - the point - describes exactly what a `git clone` of
 *     this repository would produce.
 *   - The sibling versions the bundler pins those templates to. A template declares
 *     `workspace:*` and the bundler rewrites it to `^<current version>`, so bumping a library
 *     changes what the creator scaffolds while leaving every tracked file byte-identical. Hashing
 *     the files alone said "unchanged" and let the creator keep shipping ranges that no longer
 *     admitted the packages it was meant to install.
 */
export function fingerprintTemplates(repoRoot) {
  const listing = execFileSync("git", ["ls-files", "-s", "--", "templates"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const lines = listing.split("\n").filter(Boolean).sort();
  if (!lines.length) throw new Error("git reports no tracked files under templates/");

  const versions = publishedVersions(repoRoot);
  const pins = workspaceDependencies(repoRoot).map((name) => `${name}@${versions.get(name)}`);

  return `sha256-${createHash("sha256")
    .update([...lines, ...pins].join("\n"))
    .digest("base64")}`;
}
