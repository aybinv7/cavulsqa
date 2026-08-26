import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

/**
 * A content hash of every tracked file under `templates/`, used to prove that `@cavulsqa/create`
 * was republished after the templates changed.
 *
 * The creator bundles the templates at pack time, so a template fix reaches nobody until a new
 * version of the creator goes out. Nothing about that is visible in a diff, which is exactly the
 * kind of coupling that gets forgotten - so it is checked rather than remembered.
 *
 * It asks git rather than walking the directory. Walking gave two different answers on a Windows
 * working copy and on a CI checkout, because the disk holds whatever each machine happens to have:
 * ignored files, build leftovers, and CRLF where the runner has LF. `git ls-files -s` reports the
 * blob hash recorded in the index, which is normalised, platform-independent, and - the point -
 * describes exactly what a `git clone` of this repository would produce.
 */
export function fingerprintTemplates(repoRoot) {
  const listing = execFileSync("git", ["ls-files", "-s", "--", "templates"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const lines = listing.split("\n").filter(Boolean).sort();
  if (!lines.length) throw new Error("git reports no tracked files under templates/");

  return `sha256-${createHash("sha256").update(lines.join("\n")).digest("base64")}`;
}
