# cavulsqa

Reusable Vue + SQLite building blocks for phones, published under the `@cavulsqa` npm scope.

They exist so unrelated apps can share one offline-first data layer instead of each growing its
own. Nothing here is tied to a particular backend: these packages know about SQLite, Kysely and
reactivity, and nothing about where data comes from.

## Packages

| Package                                           | What it is                                                                                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cavulsqa/mobile-db`](packages/mobile-db)       | SQLite persistence for Kysely over three engines: the Capacitor plugin, official `sqlite-wasm` on OPFS, or `wa-sqlite`. Migrations, transaction-aware writes, column helpers, sql.js for tests. |
| [`@cavulsqa/reactive-db`](packages/reactive-db)   | Framework-agnostic reactive query primitives: table-change bus, result cache, visibility gate, mutation proxy, query metrics.                                                                   |
| [`@cavulsqa/reactive-vue`](packages/reactive-vue) | Vue bindings for the above: a `useReactiveQuery` composable, Framework7 page visibility, and a reactive metrics view.                                                                           |

## Three storage engines

`mobile-db` exposes each behind the same Kysely `Dialect`, so nothing above the dialect changes when
you swap them:

| Engine                                    | Import                     | Notes                                                                                                                       |
| ----------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `@capacitor-community/sqlite`             | `@cavulsqa/mobile-db`      | A real file behind a native bridge. Needs the plugin in the APK.                                                            |
| `@sqlite.org/sqlite-wasm`, `opfs-sahpool` | `@cavulsqa/mobile-db/opfs` | **Fastest measured on a phone.** No native plugin at all.                                                                   |
| `wa-sqlite` (3 VFS choices)               | `@cavulsqa/mobile-db/wa`   | JavaScript VFS layer, so it reaches IndexedDB — the only durable route on a WebView too old for synchronous access handles. |

Measured on a phone at 100k rows across 10 tables, the Capacitor bridge is the only clear loser
(~35.7 s against ~12 s for the suite); the two OPFS engines are indistinguishable. The single
biggest factor is not the engine but **batching**: one measurement went from 691.8 ms to 32.0 ms
(~21x) by writing a batch inside one transaction instead of a row at a time.

An app that only uses a worker engine imports from `@cavulsqa/mobile-db/core` and drops the
Capacitor plugin, and its native code, entirely.

## Deliberately not here

- **No sync engine.** No `_ruid`, no `_sync_status`, no push/pull queue. Local SQLite is the
  source of truth. Apps that need to reconcile with a server bring their own engine.
- **No domain models and no backend-specific transport.** Those belong to the app that owns them.

## Toolchain

[Vite+](https://viteplus.dev) (`vp`) handles package management, tests, lint, format, and library
builds. There is no separate pnpm/vitest/eslint/prettier configuration.

```bash
vp install         # install everything
vp run -r build    # build every package
vp check           # format + lint + type check
vp run -r test     # test every package
```

Build before check on a fresh clone. Each package's `exports` points into `dist`, which is not
committed, so `reactive-vue` cannot resolve `reactive-db`'s declarations until they exist.

## Creating an app

One command, no clone:

```bash
pnpm create @cavulsqa my-app
```

It asks for the name, the Android application id, the storage engine and the pragma profile, or
takes them as flags (`--name`, `--app-id`, `--engine`, `--pragmas`, `--yes` for no prompts). The
engine choice is written to `.env` as `VITE_STORAGE_ENGINE`; the app still falls back through the
rest of the chain if the device cannot open it. `--engine` offers exactly what the template
implements — the list is checked against the template's own `STORAGE_IDS` at pack time.

The templates are bundled into `@cavulsqa/create` when it is packed, with `workspace:` and
`catalog:` resolved to concrete versions, so a generated app pins the package versions that existed
when the creator was published. A test refuses to let the templates change without republishing the
creator.

### New work inside this repo

```bash
vp create vite:library --directory packages/<name>      # a new package
vp create vite:application --directory apps/<name>      # a new app
```

## Templates

`templates/f7-app` is the starter: Vue 3 + Framework7 + Capacitor + SQLite, a tabbed shell, and the
`domains` / `modules` / `shared` layout. It is a workspace package, so `vp check` type-checks it
against these packages on every change - a template CI does not build is a template that rots.

What it carries beyond a blank app:

- Android back button that closes the topmost layer in the right order before it navigates
- Keyboard handling: scroll-into-view across every phase of the transition, tab bar out of the way
- Status bar overlaying the web view, with the page owning the inset
- Tabs defined as data in `app/tabs.ts`, each its own Framework7 view with its own history
- SQLite wired through `@cavulsqa/*` with one change bus shared by writes and reactive queries

## Planned

- More templates behind `@cavulsqa/create`, chosen with `--template`.
