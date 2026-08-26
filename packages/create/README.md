# @cavulsqa/create

Create a Vue 3 + Framework7 + Capacitor + SQLite app. One command, no clone.

```bash
pnpm create @cavulsqa
```

`npm create @cavulsqa`, `bun create @cavulsqa` and `vp create @cavulsqa` all work the same way. With
a terminal it asks four questions; with `--name` it asks none, which is what CI wants.

```bash
pnpm create @cavulsqa --name caputa --app-id com.sig.caputa --yes
```

| flag         | default          |                                                        |
| ------------ | ---------------- | ------------------------------------------------------ |
| `--name`     | asked            | package and directory name                             |
| `--template` | the only one     | which bundled template                                 |
| `--dir`      | `./<name>`       | where to write it                                      |
| `--app-name` | `Name`           | launcher name, window title, Settings screen           |
| `--app-id`   | `com.ayb.<name>` | Android application id                                 |
| `--from`     | —                | a template directory on disk, instead of a bundled one |
| `--yes`      | —                | take the defaults, ask nothing                         |

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
