# @cavulsqa/reactive-vue

Vue bindings for [`@cavulsqa/reactive-db`](../reactive-db). This is the layer you would otherwise
copy between apps.

- `createReactiveQuery(deps)` — returns `useReactiveQuery`, `useStructuralQuery`, and
  `useStaticQuery`, bound to Vue's lifecycle: fetch on mount, refetch on table change (debounced),
  in-flight deduplication by query key, retry with backoff, stale-while-revalidate, a per-instance
  cache window, cancel on unmount, and a deferred first read via a reactive `enabled`.
- An injectable `logger`, so failures reach your error service rather than only the console.
- `createVueQueryMetrics()` — the recorder with its state in `reactive()`, plus a `useQueryMetrics`
  composable of derived counters for a dev-tools panel.
- `@cavulsqa/reactive-vue/framework7` — `providePageVisibility()` / `usePageVisibility()`, which
  track whether the surrounding page is on screen so a background tab stops refetching. Framework7
  page events and `.page` by default; both are options, so another router can reuse it.

Nothing in the base entry knows about Framework7. The visibility adapter is a separate subpath you
opt into.

## Why a factory

The change bus and the metrics recorder are app-owned singletons — writes have to emit on the same
bus the queries listen to. Rather than have the package own a global, you pass them in once:

```ts
import { createChangeBus, createReactiveDb } from "@cavulsqa/reactive-db";
import { createReactiveQuery, createVueQueryMetrics } from "@cavulsqa/reactive-vue";
import { usePageVisibility } from "@cavulsqa/reactive-vue/framework7";

const bus = createChangeBus();
const metrics = createVueQueryMetrics();

export const rdb = createReactiveDb<Database>({
  getDb: () => dbService.getDb(),
  emitChange: bus.emit,
});

export const { useReactiveQuery, useStructuralQuery, useStaticQuery } = createReactiveQuery({
  onTableChange: bus.on,
  metrics: metrics.recorder,
  useVisibility: usePageVisibility,
});

export const { useQueryMetrics } = metrics;
```

Then, at a call site:

```ts
const { data, loading, error, refetch } = useReactiveQuery(
  () => rdb.selectFrom("sale_order").selectAll().execute(),
  { tables: ["sale_order"], queryKey: ["sale_order:list"] },
);
```

`metrics` defaults to a no-op recorder. `useVisibility` defaults to always-visible — without an
adapter, a screen the user cannot see still refetches. `logger` defaults to the console; pass your
app's error service and a failed query lands where every other failure does:

```ts
createReactiveQuery({
  onTableChange: bus.on,
  logger: { debug: noop, warn: reportWarning, error: reportError },
});
```

## queryKey is an identity, built from arguments

A key is an array, and two mounted queries whose keys hash alike await one request and share its
result. That is what you want — the same list rendered twice costs one query — and it is only safe
because the key carries the arguments:

```ts
queryKey: ["sale_order", id]; // two detail pages, two identities
queryKey: ["sale_order:list"]; // one list, shared wherever it appears
```

Refs inside a key are unwrapped and tracked, so the key can follow a filter. When it moves, the
query re-runs through the same debounce a table change uses — no `refetch()` on every keystroke:

```ts
const term = ref("");
useReactiveQuery(() => search(term.value), {
  tables: ["sale_order"],
  queryKey: ["sale_order:search", term],
  debounce: 200,
});
```

A key may hold anything JSON can represent; object field order does not matter. A function or a
symbol throws rather than hashing to the same string as every other one. As a backstop, mounting
the same key against different `tables` logs a warning; pass `warnOnKeyConflict: false` to silence
it.

## What this does not do

`cacheTime` is a **per-instance** revalidation window: it suppresses a refetch that a table change
would otherwise trigger, on that one query. It is not a shared cache — two screens running the same
query each hold their own result, and neither reads the other's.

`@cavulsqa/reactive-db` exports `createResultCache`, which is a real bounded keyed cache, but this
composable does not use it. Wiring it in means invalidating cached entries by table on every change
event, which is most of what a query-cache library does; if you need that, reach for
[TanStack Query](https://tanstack.com/query) and drive `invalidateQueries` from `bus.on` instead of
growing this one.

## Deferring a tab's first read

Framework7 mounts every tab at startup. Without `enabled`, a tab the user has not opened still
competes for the one native database thread while the first screen loads:

```ts
useReactiveQuery(load, {
  tables: ["partner"],
  queryKey: ["partner:list"],
  enabled: isTabActive, // a ref - activation starts the read and the subscription together
});
```

## Install

```bash
vp install @cavulsqa/reactive-vue @cavulsqa/reactive-db vue
```
