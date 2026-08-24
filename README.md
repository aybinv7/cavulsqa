# cavulsqa

Reusable Capacitor + Vue + SQLite building blocks, published under the `@cavulsqa` npm scope.

These packages started life inside a private Odoo-facing monorepo and were extracted so that
unrelated apps can share them. Anything tied to a specific backend stayed behind.

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

## Planned

- `apps/starter` — a Capacitor + Vue app template that consumes these packages, kept honest by
  running in this repo's CI.
- `@cavulsqa/create` — a `createConfig.templates` manifest so `vp create @cavulsqa` opens a
  picker over the templates published here.
