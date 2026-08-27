# Changelog

Starts at `1.0.0`. Earlier versions are in the git history and are not documented here.

`mobile-db`, `reactive-db` and `reactive-vue` share one version and release together — see
[docs/RELEASING.md](docs/RELEASING.md). `@cavulsqa/create` tracks template changes on its own
cadence and has its own section.

## Libraries

### 1.0.0

**No API change.** Entry points and peer dependencies are identical to the previous release
(`mobile-db@0.6.0`, `reactive-db@0.3.0`, `reactive-vue@0.3.0`). Upgrading is a version bump and
nothing else.

What it declares:

- **The libraries now share one version.** Under `0.x` a caret range pins the minor, so `^0.3.0`
  refused `0.4.0` — every release was a wall consumers had to climb, and climbing it meant moving
  all three anyway while reading three different numbers to work out which combination was current.
  Past `1.0.0` an additive release is a minor and `^1.x` takes it without anyone editing a manifest.
- **The API is stable enough to promise.** The surface is deliberately small — 9 exported
  declarations in `mobile-db`, 8 in `reactive-db`, 2 in `reactive-vue` — and it has been measured on
  an Android device against a real app rather than inferred.

The only manifest change: `reactive-vue` now declares `peer @cavulsqa/reactive-db@^1.0.0`.

#### Upgrading from 0.x

If you are on `mobile-db@0.6.0` / `reactive-db@0.3.0` / `reactive-vue@0.3.0`, bump all three to
`1.0.0` together and change nothing else.

If you are on something older, the breaking changes you have to cross were released in `0.6.0` and
`0.3.0`, not here:

- The `@capacitor-community/sqlite` dialect and the `./core` entry point were removed. SQLite now
  runs as WebAssembly in a worker against a real OPFS file — import from `@cavulsqa/mobile-db/opfs`
  or `@cavulsqa/mobile-db/wa`, and wrap the chain in `openFirstAvailable` so a WebView that cannot
  run the fastest engine still opens the app. Measured on a device on identical data, the native
  bridge wrote 9,158 rows in 16.9 s against 6.9 s, and ran an app's own screen queries about 1.3x
  slower; its only win was opening ~195 ms sooner, once per launch, behind a splash screen.
- Query identity comes from a key array (`["order", id]`) hashed by `hashQueryKey`, not from a name
  the caller invents. Two detail pages that both called themselves `"order-detail"` shared one
  request, and one of them rendered the other's row.
- `reactive-vue`'s `useReactiveQuery` takes `queryKey` instead of `name`, and accepts refs inside
  the key so it re-runs when the key moves.

## @cavulsqa/create

### 2.5.0

- Templates scaffold apps pinned to the `1.0.0` libraries.
- **Fixed:** the template fingerprint had a blind spot. It hashed the tracked files under
  `templates/`, but a template declares `workspace:*` and the bundler rewrites it to
  `^<current version>` at pack time — so bumping a library changed what the creator scaffolds while
  leaving every tracked file byte-identical. The guard reported "unchanged, no bump needed" and the
  creator would have kept handing out apps pinned to superseded ranges. It now hashes the resolved
  pins as well, scoped to the packages the templates actually declare.
- Dropped the last references to the Capacitor SQLite dialect from the READMEs.

> **Note:** scaffold with an explicit version — `pnpm dlx @cavulsqa/create@2.5.0`. `pnpm create`
> can serve a cached older creator, which silently drops `--engine` / `--pragmas` and pins stale
> library ranges.
