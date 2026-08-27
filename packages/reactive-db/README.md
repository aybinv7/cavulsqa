# @cavulsqa/reactive-db

Framework-agnostic primitives for keeping a UI in step with a local SQLite database.

- `createChangeBus<DB>` — publish and subscribe to per-table change events (`TableChangeEvent`).
  Pass the schema and table names are checked against it (`TableName<DB>`); subscribe to
  `ALL_TABLES` for everything.
- `hashQueryKey` — a stable string for a `QueryKey` (an array). Identity comes from the arguments,
  not from a name the caller invents, so two call sites only share a request when they are asking
  the same question. A function or symbol in a key throws rather than hashing alike.
- `createResultCache` — bounded, keyed result cache with staleness handling. A standalone
  primitive: `@cavulsqa/reactive-vue` does not use it, so nothing shares results between call
  sites unless you build that on top.
- `createVisibilityGate` — suppresses refetches while a view is hidden.
- `createReactiveDb<DB>` — wraps a Kysely instance so writes announce the tables they touched;
  `executeWithEvent` does the same for a single query. A transaction reports **what it actually
  did** per table, not a blanket `"bulk"` — otherwise a query filtering on `refetchOn` ignores
  precisely the batched writes that matter.
- `createQueryMetrics` — query duration, error, and cache-hit counters.
- `ReactiveQueryOptions`, `calcRetryDelay`, `noopMetrics` — the option contract and retry policy a
  framework binding builds on.

## Table names are the one argument that fails silently

Misspell one in `tables` and the query subscribes to a table nobody writes to: no error, no warning,
a screen that is stale forever. So pass the schema:

```ts
const bus = createChangeBus<Database>();
bus.emit("sale_ordr", "insert"); // ← a type error, with a "did you mean" suggestion
```

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
