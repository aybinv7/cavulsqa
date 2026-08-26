# @cavulsqa/create

Create a Vue 3 + Framework7 + Capacitor + SQLite app. One command, no clone.

```bash
pnpm create @cavulsqa
```

`npm create @cavulsqa`, `bun create @cavulsqa` and `vp create @cavulsqa` all work the same way. With
a terminal it asks four questions; with `--name` it asks none, which is what CI wants.

**On PowerShell, quote the scope** — or use `npx`:

```powershell
pnpm create '@cavulsqa'
npx @cavulsqa/create --name myapp
```

Unquoted, `@cavulsqa` is PowerShell's splatting operator: it expands an undefined variable to
nothing, pnpm never sees a package name, and you get a 404 for something like `create---name`. The
`npx` form has no leading `@` on a bare token, so it is immune.

There is no unscoped `create-cavulsqa`, so `pnpm create cavulsqa` is a 404 as well.

```bash
pnpm create @cavulsqa --name caputa --app-id com.example.caputa --yes
```

| flag         | default          |                                                         |
| ------------ | ---------------- | ------------------------------------------------------- |
| `--name`     | asked            | package and directory name                              |
| `--template` | the only one     | which bundled template                                  |
| `--dir`      | `./<name>`       | where to write it                                       |
| `--app-name` | `Name`           | launcher name, window title, Settings screen            |
| `--app-id`   | `com.ayb.<name>` | Android application id                                  |
| `--engine`   | asked            | which storage engine the app prefers, written to `.env` |
| `--pragmas`  | `safe`           | `safe` keeps durability, `fast` trades it for speed     |
| `--from`     | —                | a template directory on disk, instead of a bundled one  |
| `--yes`      | —                | take the defaults, ask nothing                          |

## What you get

The `f7-app` template: a tabbed shell, a `domains` / `modules` / `shared` layout, and a working
sales demo over a six-table schema — dashboard aggregates, search, an order sheet, swipe actions,
a detail screen — with tests against real SQLite.

Underneath it, the data layer this repository publishes: `@cavulsqa/mobile-db` for Capacitor SQLite
under Kysely, `@cavulsqa/reactive-db` for the change bus, and `@cavulsqa/reactive-vue` for
`useReactiveQuery`. A write announces the tables it touched and every query watching them refetches;
nothing in a screen asks for a refresh.

`CLAUDE.md`, `.claude/rules/` and `.claude/skills/` come with it, so an agent opening the generated
repository knows the architecture, the conventions, and the traps that have already cost someone a
day.

## Choosing an engine

`--engine` writes a `.env`, it does not edit the config. The chain in `src/app/storage.config.ts`
stays intact and the chosen engine is simply promoted to the front, so a device that cannot open it
still falls back rather than failing.

| id                             | when                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `sqlite-wasm-opfs-sahpool`     | the default. The SQLite team's own build; faster at writes, transactions and seeding          |
| `wa-sqlite-access-handle-pool` | faster at joins and scans on measured hardware; a single-maintainer project                   |
| `wa-sqlite-opfs-async`         | wa-sqlite over OPFS without the pool, on the Asyncify build                                   |
| `wa-sqlite-idb-batch-atomic`   | SQLite pages in IndexedDB. Slowest, and the only one that needs no synchronous access handles |

The ids come from the template itself, so a template that offers a different set is asked about
correctly rather than validated against a list kept here.

## Versions

The template's dependencies are resolved and pinned when this package is published, so a given
version of `@cavulsqa/create` always generates the same app. Upgrading the data layer afterwards is
an ordinary `pnpm update`.

## After generating

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs the app in a browser against sql.js in memory — quick for UI work, and data does not
survive a reload. The real target is a device:

```bash
npx cap add android
pnpm build && npx cap sync android && npx cap run android
```

Android builds need **JDK 21**. An older one fails with `invalid source release: 21` from inside
`capacitor-android`, which reads like a Capacitor bug and is not one.

## Changing a template

The templates are bundled when this package is packed, so a template fix reaches nobody until a new
version of `@cavulsqa/create` is published. Nothing in a template commit hints at that, so it is
enforced rather than remembered: a test fingerprints `templates/` and fails when the recorded
fingerprint is stale.

```bash
pnpm --filter @cavulsqa/create run stamp          # patch
pnpm --filter @cavulsqa/create run stamp minor    # new capability in a template
```

That records the fingerprint and bumps the version in one step; publish as usual afterwards. It is
a no-op when the templates have not moved, so running it out of habit costs nothing.
