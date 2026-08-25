---
name: reactive-data
description: Reading and writing the local SQLite database in this app. Use whenever the task involves a query, a mutation, a repository, a migration, the schema, useReactiveQuery, the change bus, stale data, a screen not refreshing, query metrics, or testing data access. Covers the tables invalidation contract, why every write goes through rdb, and how to test SQL without a device.
---

# Reactive data workflow

SQLite is the source of truth. A screen reads it through a reactive query; a write announces the
tables it touched and every query watching one of them refetches. Nothing calls refetch by hand.

## Adding a read

```ts
const query = useReactiveQuery(() => searchOrders(getDatabase().db, term.value), {
  tables: ["sales_order", "order_line", "customer"],
  queryKey: uniqueQueryKey("demo:orders"),
  debounce: 250,
});
```

1. Put the SQL in a repository: `src/domains/<domain>/<domain>.repository.ts`, taking the database
   as its first parameter. Never reach for the singleton inside a repository — that is what makes it
   testable.
2. **List every table the SQL touches in `tables`.** Count them in the query, not from memory: a
   join means each joined table. Under-list and the screen goes stale with no error; over-list and
   an unrelated write re-runs an expensive query.
3. `queryKey`: default to `uniqueQueryKey("prefix")`. A stable literal means "share this result with
   any other query using the same key", which is right for one list rendered twice and wrong for
   anything parameterised.
4. `debounce` so a burst of writes causes one refetch.

## Adding a write

```ts
await saveOrder(rdb, payload);        // announces its tables
await saveOrder(getDatabase().db, …); // writes, and no screen notices
```

`rdb` is the reactive wrapper. A raw write lands in SQLite silently and the UI keeps showing old
rows until something unrelated refetches — no error, nothing to see in review.

All-or-nothing work goes in one transaction. A helper anyone can press twice must survive being
pressed twice: insert-where-missing, or `onConflict(...).doNothing()`.

## Schema changes

`schema.ts` and `migrations.ts` are edited together — a field in one and not the other is a runtime
error the compiler cannot see. Migrations are numbered, never renamed, never edited after shipping.
Money is integer cents. Index what you filter and join by.

## Testing

Always. [testing.md](testing.md) has the harness: a Kysely on `createSqlJsDialect()`, migrate, then
assert against real rows — including the arithmetic. A total that type-checks can still be computed
wrong, and a device is not needed to catch that.

## Diagnosing "the screen did not update"

In order:

1. Did the write go through `rdb`?
2. Does the query's `tables` include the table that changed?
3. Is the query's `queryKey` shared with a different query? Check the console for the conflict
   warning.
4. Is the page off-screen? `usePageVisibility` suppresses refetches for hidden pages by design.
5. Only then look at the packages.

## Proof obligations

Name the tables the SQL touches and confirm `tables` matches. Say whether a test covers it. Never
claim a data path works on the strength of a type-check.
