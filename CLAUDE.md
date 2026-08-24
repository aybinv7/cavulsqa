<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# cavulsqa

Reusable Capacitor + Vue + SQLite packages published under the `@cavulsqa` scope. Extracted from a
private Odoo-facing monorepo so unrelated apps can share them.

## Hard rules

- **No sync contract.** These packages must not reference `_ruid`, `_sync_status`, `_delete_date`,
  or any push/pull queue. That coupling is exactly what was stripped during extraction; putting it
  back defeats the point. Local SQLite is the source of truth.
- **No framework dependency in `reactive-db`.** It deliberately has no `vue` import — `isVisible?:
{ value: boolean }` is a structural stand-in for a ref. Keep it that way so non-Vue callers work.
  Vue-specific code belongs in `reactive-vue`, and a future `reactive-svelte` would sit beside it
  rather than inside `reactive-db`.
- **`reactive-vue` injects, never owns, the app's singletons.** The change bus and the metrics
  recorder are arguments to `createReactiveQuery`, because writes must emit on the same bus the
  queries listen to. Do not introduce a module-level bus or recorder in the package — importing
  app globals directly is what made this layer un-shareable where it came from.
- **A `queryKey` is an identity.** Two mounted queries sharing one await a single request and
  share the result, so a duplicated key crosses two queries' results. Default to
  `uniqueQueryKey()`; a stable literal is opt-in sharing. The conflict warning is a backstop, not
  a design.
- **Do not grow `useReactiveQuery` into a cache library.** `cacheTime` is a per-instance
  revalidation window and `createResultCache` is deliberately unwired. A shared cache needs
  by-table invalidation of cached entries, which is most of TanStack Query - if that is the
  requirement, drive `invalidateQueries` from `bus.on` rather than reimplementing it here.
- **No backend, domain models, or transport.** Those live in the consuming app.
- **`vp` is the toolchain.** Do not add pnpm scripts, vitest configs, eslint, or prettier. Use
  `vp check`, `vp run -r test`, `vp run -r build`.
- **`pack.exports: true` means tsdown owns the `exports` field.** Edit `pack.entry` in
  `vite.config.ts`, then run `vp pack`; do not hand-write `exports` in `package.json`.
- **Watch the tarball.** tsdown externalizes `dependencies` and `peerDependencies` but bundles
  `devDependencies`. A test-only dependency belongs in `peerDependencies` with
  `peerDependenciesMeta.optional`, or it ends up inlined in the published output.
- **Relative imports need explicit `.js` extensions** — the packages type-check under
  `moduleResolution: nodenext`.
