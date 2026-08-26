# cavulsqa

Reusable Capacitor + Vue + SQLite building blocks, published under the `@cavulsqa` npm scope.

They exist so unrelated apps can share one offline-first data layer instead of each growing its
own. Nothing here is tied to a particular backend: these packages know about SQLite, Kysely and
reactivity, and nothing about where data comes from.

## Packages

| Package                                           | What it is                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@cavulsqa/mobile-db`](packages/mobile-db)       | Capacitor SQLite persistence for Kysely: a shared-connection dialect, migration runner, transaction-aware writes, column helpers, and an sql.js dialect for tests. |
| [`@cavulsqa/reactive-db`](packages/reactive-db)   | Framework-agnostic reactive query primitives: table-change bus, result cache, visibility gate, mutation proxy, query metrics.                                      |
| [`@cavulsqa/reactive-vue`](packages/reactive-vue) | Vue bindings for the above: a `useReactiveQuery` composable, Framework7 page visibility, and a reactive metrics view.                                              |

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

## Scaffolding

`vp create` is the entry point for new work in this repo:

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

- `apps/starter` — a Capacitor + Vue app template that consumes these packages, kept honest by
  running in this repo's CI.
- `@cavulsqa/create` — a `createConfig.templates` manifest so `vp create @cavulsqa` opens a
  picker over the templates published here.
