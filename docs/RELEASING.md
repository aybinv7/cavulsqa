# Releasing

Everything under `packages/` publishes to npm under the `@cavulsqa` scope. Anything marked
`private: true` is skipped.

| Package                  | What it is                                    |
| ------------------------ | --------------------------------------------- |
| `@cavulsqa/mobile-db`    | OPFS SQLite persistence for Kysely.           |
| `@cavulsqa/reactive-db`  | Framework-agnostic reactive query primitives. |
| `@cavulsqa/reactive-vue` | Vue bindings for reactive-db.                 |

## One version for the libraries

`mobile-db`, `reactive-db` and `reactive-vue` release together at the same version. A bump moves all
three even where nothing in one of them changed.

That is not tidiness. Under `0.x` a caret range pins the minor - `^0.3.0` refuses `0.4.0` - so every
release was already a wall a consumer had to climb, and climbing it meant moving all three anyway
while reading three different numbers to work out which combination was current. Being past `1.0.0`
is what removes the wall: an additive release is a minor, and `^1.x` takes it without anyone
editing a manifest.

The cost is real and accepted: some published versions of a package contain no change to that
package. Two tests keep the policy honest rather than remembered - `libraryVersions.test.mjs` fails
when the three disagree or when one slips back under `1.0.0`, and `workspacePeers.test.mjs` fails
when a bump leaves a sibling's peer range behind.

`@cavulsqa/create` is **not** in that set. Its version tracks template changes through the recorded
fingerprint, on its own cadence.

## How a release happens

1. Bump the version in the package's `package.json`. That file is the source of truth for what gets
   released. `bumpp` is available in each package for this. For the three libraries, bump all of
   them to the same version and carry the peer ranges with it - `vp run -r test` says so if you
   forget. A template edit or a library bump also needs
   `pnpm --filter @cavulsqa/create run stamp [patch|minor|major]`, because both change what the
   creator scaffolds.
2. Run the **release** workflow (Actions > release > Run workflow). Leave `dry-run` checked the
   first time and read the log.
3. Run it again with `dry-run` unchecked.

`npm publish` refuses a version that already exists, so a run only ships the packages you actually
bumped and re-running is safe. Nothing writes back to the repository, so no bot commit races a
developer push.

## Trusted publishing, and why the first release is manual

CI authenticates by **trusted publishing**: the workflow exchanges a short-lived GitHub OIDC token
for a publish credential scoped to this repository and this workflow file. There is no `NPM_TOKEN`
anywhere - nothing to leak, nothing to rotate, and it satisfies the account's 2FA requirement, which
a CI job cannot do interactively.

The catch: a trusted publisher is configured **per package** in that package's settings on
npmjs.com, which requires the package to exist. So version one of each package is published by
hand, once:

```sh
# from the workspace root, after `npm login` (run login from outside this
# directory - see the devEngines note below)
pnpm publish -r --access public --otp=<code-from-your-authenticator>
```

Then, for each package on npmjs.com: **Settings > Trusted publisher**, GitHub Actions, repository
`aybinv7/cavulsqa`, workflow `release.yml`. After that every release runs from CI.

## Prerequisites, once

- The npm organisation `cavulsqa` must exist. Create it at npmjs.com; the scope has no packages
  today, but org names share a namespace with usernames, so confirm it is actually free.
- `npm` refuses to run inside this workspace: the root declares
  `devEngines.packageManager: pnpm`, which makes `npm login` fail with `EBADDEVENGINES`. Run it from
  your home directory instead.

## Provenance

The repository is public, so the release workflow's `provenance` input defaults to **true**: every
published version carries a signed attestation linking it to the commit and workflow run that built
it. Under trusted publishing npm attaches provenance by default anyway - the input exists so a run
can turn it off, which is only needed if the repository ever goes private again.
