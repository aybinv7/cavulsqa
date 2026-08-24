# Releasing

Everything under `packages/` publishes to npm under the `@cavulsqa` scope. Anything marked
`private: true` is skipped.

| Package                 | What it is                                    |
| ----------------------- | --------------------------------------------- |
| `@cavulsqa/mobile-db`   | Capacitor SQLite persistence for Kysely.      |
| `@cavulsqa/reactive-db` | Framework-agnostic reactive query primitives. |

## How a release happens

1. Bump the version in the package's `package.json`. That file is the source of truth for what gets
   released. `bumpp` is available in each package for this.
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

The release workflow's `provenance` input defaults to **false** because npm can only attest a build
from a **public** repository. Once this repository is public, flip that default to `true` - under
trusted publishing npm attaches provenance by default anyway, and on a private repository the
publish fails unless it is explicitly disabled.
