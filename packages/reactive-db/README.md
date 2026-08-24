# @cavulsqa/reactive-db

Framework-agnostic primitives for keeping a UI in step with a local SQLite database.

- `createChangeBus` — publish and subscribe to per-table change events (`TableChangeEvent`).
- `createResultCache` — bounded, keyed result cache with staleness handling. A standalone
  primitive: `@cavulsqa/reactive-vue` does not use it, so nothing shares results between call
  sites unless you build that on top.
- `createVisibilityGate` — suppresses refetches while a view is hidden.
- `createReactiveDb` — wraps a Kysely instance so writes announce the tables they touched;
  `executeWithEvent` does the same for a single query.
- `createQueryMetrics` — query duration, error, and cache-hit counters.
- `ReactiveQueryOptions`, `calcRetryDelay`, `noopMetrics` — the option contract and retry policy a
  framework binding builds on.

`kysely` is an **optional** peer: it is imported for types only. Marking it optional keeps npm
from auto-installing a kysely major that `@cavulsqa/mobile-db` cannot use - which otherwise
resolves the whole tree onto an older mobile-db.

**No framework dependency.** There is no `vue` import; `isVisible?: { value: boolean }` is a
structural stand-in for a ref, so any framework (or none) can drive it. Vue bindings live in
[`@cavulsqa/reactive-vue`](../reactive-vue).

## Install

```bash
vp install @cavulsqa/reactive-db
```
