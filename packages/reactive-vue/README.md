# @cavulsqa/reactive-vue

Vue bindings for [`@cavulsqa/reactive-db`](../reactive-db). This is the layer you would otherwise
copy between apps.

- `createReactiveQuery(deps)` — returns `useReactiveQuery`, `useStructuralQuery`, and
  `useStaticQuery`, bound to Vue's lifecycle: fetch on mount, refetch on table change (debounced),
  in-flight deduplication by query key, retry with backoff, stale-while-revalidate, a cache window,
  cancel on unmount, and a deferred first read via a reactive `enabled`.
- `providePageVisibility()` / `usePageVisibility()` — tracks whether the surrounding page is on
  screen, so a background tab stops refetching. Framework7 page events by default; pass your own
  `events` and `pageSelector` for another router.
- `createVueQueryMetrics()` — the recorder with its state in `reactive()`, plus a `useQueryMetrics`
  composable of derived counters for a dev-tools panel.

## Why a factory

The change bus and the metrics recorder are app-owned singletons — writes have to emit on the same
bus the queries listen to. Rather than have the package own a global, you pass them in once:

```ts
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
import { createReactiveQuery, createVueQueryMetrics } from "@cavulsqa/reactive-vue";

const bus = createChangeBus();
const metrics = createVueQueryMetrics();

export const rdb = createReactiveDb<Database>({
  getDb: () => dbService.getDb(),
  emitChange: bus.emit,
});

export const { useReactiveQuery, useStructuralQuery, useStaticQuery } = createReactiveQuery({
  onTableChange: bus.on,
  metrics: metrics.recorder,
});

export const { useQueryMetrics } = metrics;
```

Then, at a call site:

```ts
const { data, loading, error, refetch } = useReactiveQuery(
  () => rdb.selectFrom("sale_order").selectAll().execute(),
  { tables: ["sale_order"], queryKey: "sale_order:list" },
);
```

`metrics` is optional and defaults to a no-op recorder. `useVisibility` is optional and defaults to
the Framework7 page-visibility composable; pass `isVisible` per call site to override it.

## Deferring a tab's first read

Framework7 mounts every tab at startup. Without `enabled`, a tab the user has not opened still
competes for the one native database thread while the first screen loads:

```ts
useReactiveQuery(load, {
  tables: ["partner"],
  queryKey: "partner:list",
  enabled: isTabActive, // a ref - activation starts the read and the subscription together
});
```

## Install

```bash
vp install @cavulsqa/reactive-vue @cavulsqa/reactive-db vue
```
