# Changelog

Starts at `1.0.0`. Earlier versions are in the git history and are not documented here.

`mobile-db`, `reactive-db` and `reactive-vue` share one version and release together — see
[docs/RELEASING.md](docs/RELEASING.md). `@cavulsqa/create` tracks template changes on its own
cadence and has its own section.

## Unreleased

**New packages: `@cavulsqa/m3e` and `@cavulsqa/m3e-vue`** - Material 3 Expressive, extracted from the
hand-ported copies in three apps into one tested source. `m3e` is framework-free: the 2025 colour
spec with the variant fallback made explicit (`effectiveSpec`), all 35 `MaterialShapes` built from
the androidx vertices, morphing, closed-form springs with velocity, `linear()` spring easings, the
wavy progress and loading-indicator frames, and every `--md-sys-*` token. `m3e-vue` holds 56
components (date and time pickers as dialog or sheet, Framework7-style wheel pickers, a virtual list
that recycles its rows), an overlay stack Android back can close, and promise-based snackbar, dialog and action
sheet services. Both join the libraries' shared version.

**New package: `@cavulsqa/recorder`** - an in-app field recorder for Capacitor WebViews: rrweb,
console, network, performance and database tracks in a `.capu` archive Capubridge opens. `f7-app`
starts it after the database opens (`VITE_FIELD_RECORDER`, on in dev) and shares captures through the
Android share sheet. It must be published before the next creator release.

**New template: `m3e-app`** (`--template m3e-app`) - the same data layer in Material 3 Expressive,
with Framework7 kept as the navigation engine only, a colour studio, an adaptive bar/rail shell, a
component gallery and an `m3-expressive` skill. The creator now offers templates from a numbered
menu; `f7-app` stays the default.

**Fixed before release, found on a device audit:**

- Framework7's core stylesheet sizes every bare `button` to `width: 100%`. The components never set
  a width, so tabs overflowed the page and dragged it sideways, and dialog actions, the snackbar
  action and the hero buttons each took a full row. The package now undoes it at zero specificity.
- Vue compiles `:global(.parent) .child` to `.parent` alone. The FAB menu items never became
  visible, and the right-to-left rules rotated the page root. Whole selectors are now wrapped, and a
  test rejects the broken form.
- Shadows, spacing and sizes were checked against the Compose Material3 sources: no shadow on
  dialogs or FAB menu items, none on the floating toolbar (1dp with a FAB), the 48dp sheet handle
  area, fixed tabs sharing the row, the split button's asymmetric padding, 24dp icons in icon
  buttons, the snackbar under modal windows.
- Pickers opened with `open` already true showed 00:00 instead of their value.
- `m3e-app` keeps the splash up until the first page renders, hides it when the bootstrap fails
  (also fixed in `f7-app`, where a failed database open left the splash up for good), offers a reload
  when a route fails to load, and pluralises with the language's own rules.
- Second device round: the wheel picker re-rendered every option on each detent (150 on a year
  drum) and sat inside the sheet's blocking touch listener - it now marks the active option
  directly and opts out of the sheet's drag. The sheet date picker has a compact header and pinned
  actions. Calendars fill all six weeks with muted neighbouring days, and a disabled day that is
  selected keeps its contrast. In landscape the page was pushed below the screen: `F7App` passes no
  class through, so the shell's flex row never applied.
- Wheels are now built like Framework7's picker: flat rows and gradient fades instead of a
  scroll-driven 3D tilt per row and a mask on the scroller, which together lagged on phone GPUs.
  Picker sheets drag only from their handle, so no blocking touch listener sits over the wheels,
  and the per-detent haptic is throttled to one every 40ms.
- Wheel columns take `loop`: hours, minutes, days and months roll over, re-centring on a middle
  copy once a spin settles, instead of stopping at an end with empty rows.
- `M3eResolver` resolves by the `M3` prefix, so a dev server sees components added after it started.
- `m3e-app` development: linked packages skip pre-bundling, the component stylesheet is imported
  outside Tailwind's compile, and a rebuild reloads the page once, after its files exist again.

## Libraries

### 1.2.1

**Fixed: a transaction on the worker connection could interleave with other work.** One worker owns
one SQLite connection, so a statement issued while a transaction was open ran _inside_ that
transaction without asking - and rolled back with it. Kysely's `transaction()` gives each caller
what looks like a private scope, so nothing in the calling code suggests that an unrelated read or
write happening at the same moment is now part of someone else's atomic unit. A `TransactionBarrier`
holds other operations until the open transaction finishes.

**Fixed: a timed-out worker request left the channel usable.** The timeout rejected that one request
and kept the connection, which is the wrong shape for what a timeout means here: the worker never
answered, so whether the statement committed is unknown, and on Android the usual cause is the
process being frozen in the background - the reply can still arrive later, against work that has
moved on. The timeout now breaks and terminates the channel, and the rejection is a
`WorkerRequestTimeoutError` carrying `outcome: "unknown"` so a caller can tell "it failed" from "it
may have happened".

### 1.2.0

**New package: `@cavulsqa/repository`** - per-table data access over a stable row identity.

Extracted from presalio, where it had grown into two things at once. The half worth sharing is
generic: look a row up by an identity that survives a rebuilt database or a restored backup, stamp a
write time, and hide soft-deleted rows unless asked. The other half - a draft lifecycle, a
`_sync_status` column, a delete that behaves differently for a row the server has never seen - is a
sync model, and shipping it here would have made one app's sync design the standard for every app
the template generates. cavulsqa deliberately has no opinion about a server.

So the split is by layer, matching the rest of the scope: `mobile-db` is the engine, `reactive-db`
the reactivity, `repository` the data access above both. Anything that syncs wraps it - reads come
free, and only the write semantics differ.

**Also:** `@cavulsqa/mobile-db/capacitor` exports `createCapacitorDialect`, the counterpart to
`createOpfsDialect` and `createWaDialect`. Opening the native plugin is not one call - a WebView
reload leaves the native connection alive while the JS registry that tracked it is gone, so a naive
`createConnection` throws "already exists" on the second open, which is every hot reload and every
resume after Android has killed the WebView. That handling already existed inside
`createMobileDatabase`; it is reachable on its own now, and the template's engine candidate uses it
rather than a hand-rolled open.

- `createRepository(table, deps)` - `list` / `getById` / `getByRuid` / `findWhere` / `insert` /
  `update` / `softDelete` / `restore` / `query`.
- `createLocalFirstTable(db, name)` and `LOCAL_FIRST_COLUMNS` - the five columns a repository reads:
  `id`, `_ruid`, `_create_date`, `_write_date`, `_delete_date`. `mobile-db`'s
  `createTableWithDefaults` still gives a plain `id` + `created_at` and knows nothing about them,
  which is right for a SQLite layer.
- `readDb` and `rdb` are separate handles on purpose: reads through the plain one, writes through
  the reactive proxy. Passing the proxy for reads would make every read announce a change, and every
  query watching the table would refetch on every read. A test pins it.

Twelve tests against real SQLite rather than a stub, because a stub accepts SQL that SQLite refuses.

`mobile-db`, `reactive-db` and `reactive-vue` are unchanged; they carry the version because the
libraries release together.

### 1.1.0

**The Capacitor SQLite engine is back, behind `@cavulsqa/mobile-db/capacitor`.**

It should never have left. `0.6.0` made the _template_ OPFS-only and deliberately kept the dialect
in the library, for the reason recorded in that commit: the worker is serial, where this dialect
keeps reads outside the write lock, so an app that writes continuously while the UI reads - or that
needs SQLCipher, or native access to the file - should still use it. A later change removed it from
the library too, which was not the decision anyone made. This restores it.

- **Added:** `@cavulsqa/mobile-db/capacitor` exports `SharedConnectionSQLiteDialect` and
  `createMobileDatabase`. Its own entry point, like `/opfs` and `/wa`, so an app on a worker engine
  never pulls the native plugin into its APK for code that never runs. This is the one change from
  the pre-removal layout, where the dialect sat on the main entry and `/core` existed to escape it;
  `.` is now engine-independent and `/core` is gone as redundant.
- **Added:** `getRawConnection()` on the handle the Capacitor engine returns
  (`CapacitorMobileDatabase<DB>`), for native access to the file. Not on `MobileDatabase<DB>`,
  which an OPFS app implements and cannot promise it.
- **Removed:** the `capacitor-sqlite-kysely` peer dependency. Nothing in the source has imported it
  for some time, and a peer nobody imports is a question every consumer has to answer for nothing.
- **Changed:** every engine peer dependency is now optional. `kysely` is the only hard requirement,
  so installing `mobile-db` no longer asks an OPFS app for the Capacitor plugin, or a Capacitor app
  for `wa-sqlite`.
- **Fixed:** the Capacitor dialect routed reads and writes on `sql.includes("select")`, so
  `insert into "archive" ("id") select "id" from "customer"` went down the read path - the rows were
  inserted, but it reported no change count and the caller saw a write that had apparently done
  nothing. It now decides on the compiled query tree via `statementFacts`, the same as the worker
  dialect. Two tests cover it, and they fail against the old logic.
- **Fixed:** the Capacitor engine carried its own copy of the migration fast path and its own
  `ConnectionLock`. Both are now the shared ones, so it picks up the better migration error (which
  names the failing migration) and there is one lock implementation instead of two.

`reactive-db` and `reactive-vue` are unchanged in this release; they carry the version because the
libraries release together.

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

### 2.9.3

- **Fixed:** two navigations racing each other could freeze a tab for good. Framework7 only enforces
  `allowPageChange` for synchronous routes; the template's routes are async, and `asyncResolve` calls
  the router's internal `load()` with `ignorePageChange: true`. So a navigate issued while a
  transition was still animating - tapping a row as the back gesture ran, which is one thumb movement
  - ran a forward on top of an in-flight backward. That destroys the previous page element and leaves
    the router holding two copies of the same page, after which `loadBack` takes its same-url early
    return and `back()` silently does nothing forever. `allowPageChange` reads `true` the whole time,
    so the router looks healthy while the screen cannot move. A guard now drops the navigate or back
    that loses the race - one boolean read, no queueing, so the one that wins is not slowed - while
    still letting Framework7's own recursive `navigate`/`back` calls through.
- **Fixed:** a route whose chunk failed to download froze the same way. `async` hooks resolved the
  import but never rejected, and Framework7 unlocks the router only from `resolve` or `reject`, so
  one failed chunk left that view locked for the rest of the session. Routes load through a
  `lazyRoute` helper that always settles.

### 2.9.2

- **Fixed:** the Settings screen rendered the active engine's label dynamically and then a static
  sentence underneath it. On the Capacitor plugin the app named the plugin and immediately claimed
  "WebAssembly ... in a worker - no native bridge" while every statement was crossing one. It shows
  the active candidate's own `tradeoff` now, so the description cannot disagree with the engine
  above it.

### 2.9.1

- **Every open reports its engine.** A `.env` written by PowerShell's `>` is UTF-16; Vite's dotenv
  reads it as UTF-8, gets a BOM and null bytes, and drops every variable in it without a word. So
  `VITE_STORAGE_ENGINE` never reached the build, the chain took its silent "no preference" path, and
  the app opened on the default engine while reporting that engine as though it had been chosen -
  indistinguishable, from inside the app, from a preference that had been applied. The open now logs
  the engine it landed on and the preference the build was compiled with.

### 2.9.0

- **Only tracked files are copied.** Both the bundler and the generator walked the directory and
  skipped a list of names, which lets through anything nobody thought to name: a maintainer's stray
  `build/` and a deploy log reached a generated app, and would have shipped inside the published
  creator. They ask git now - the same list the template fingerprint is computed from, so what ships
  and what is hashed cannot drift apart. The walk remains for a bundled template, which carries no
  repository.
- **Fixed:** the template's `vite.config.ts` did not exclude `auto-imports.d.ts` and
  `components.d.ts` from formatting, so every generated app inherited a build and a commit hook
  taking turns rewriting a generated file. The monorepo root had the exclusion; the template did
  not.
- **Fixed:** the app's SQLite blurb still described the native bridge - "writes take turns on the
  one native connection" - on a template that ships on OPFS. Both locales.

### 2.7.0

- **`--engine capacitor-sqlite`.** The template now offers the native plugin alongside the four
  worker engines, and picking one **removes the others**. Choosing OPFS no longer installs
  `@capacitor-community/sqlite` or ships the plugin in the APK for a candidate the app can never
  reach - which is what made the choice cosmetic before.

  The template describes its own engines in `cavulsqa.engineModules`, so the generator holds no
  list of engine names: each entry is one candidate file, the engine ids it implements, the symbols
  it exports and the dependency it pulls in. Pruning drops the file, its dependency, its ids from
  `STORAGE_IDS`, its exports from the candidates barrel and from `DEFAULT_ORDER`, and its line from
  `.env.example`. Generating without `--engine` still keeps everything.

  Verified by generating both a Capacitor-only and an OPFS-only app against local tarballs: both
  install, type-check and build clean.

### 2.6.0

- Templates scaffold apps pinned to the `1.1.0` libraries.

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
