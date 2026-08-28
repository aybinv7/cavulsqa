# @cavulsqa/repository

Per-table data access for Kysely on a phone, over a stable row identity.

```sh
pnpm add @cavulsqa/repository kysely
```

## Why it exists

Every local-first app writes the same four accessors per table and then diverges on the details that
matter: which id is stable, when a write time gets stamped, and whether a delete really deletes.
This settles those three and stops there.

It knows nothing about a server. Anything that syncs adds its own columns and its own write
semantics on top - see [Extending it](#extending-it).

## The row convention

A repository reads and writes five columns, and `createLocalFirstTable` makes them:

| Column         | Why                                                                |
| -------------- | ------------------------------------------------------------------ |
| `id`           | autoincrement, local to this device                                |
| `_ruid`        | the **stable** identity: generated on the device, never reassigned |
| `_create_date` | set once                                                           |
| `_write_date`  | moved by every write                                               |
| `_delete_date` | null while live; set by `softDelete`, cleared by `restore`         |

```ts
import { createLocalFirstTable } from "@cavulsqa/repository";

await createLocalFirstTable(db, "note")
  .addColumn("title", "text", (col) => col.notNull())
  .execute();
```

`@cavulsqa/mobile-db`'s `createTableWithDefaults` gives a plain `id` + `created_at` and knows nothing
about this - it is a SQLite layer. Use the helper above for a table this package can serve.

**Why two ids.** An autoincrement id is assigned by whichever database happens to hold the row, so it
changes when a backup is restored, when a database is rebuilt, and when a server hands one back.
`_ruid` does not. Reads take the id because that is what a screen has; anything that has to survive
the row outliving this database takes `_ruid`.

## Usage

```ts
import { createRepository } from "@cavulsqa/repository";

const notes = createRepository<Database, "note">("note", {
  readDb: () => dbService.getDb(),
  rdb, // the reactive proxy: writes announce their table
  generateLocalRuid: () => crypto.randomUUID(),
  nowISO: () => new Date().toISOString(),
});

const created = await notes.insert({ title: "first" });
await notes.update(created.id, { title: "second" });
await notes.softDelete(created.id);

await notes.list(); // live rows
await notes.list({ includeDeleted: true }); // including the trash
```

**`readDb` and `rdb` are two handles onto the same database on purpose.** Reads go through the plain
one and writes through the reactive proxy, so a write announces the table it touched. Passing the
proxy for reads would make every read look like a write, and every query watching that table would
refetch on every read.

## The surface

| Method               | Notes                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `list(opts?)`        | hides soft-deleted rows unless `includeDeleted`; orders, limits, offsets |
| `getById(id)`        |                                                                          |
| `getByRuid(ruid)`    |                                                                          |
| `findWhere(partial)` | equality on every column given; does **not** hide deleted rows           |
| `insert(row)`        | stamps identity and both dates, reads the row back by `_ruid`            |
| `update(id, patch)`  | moves `_write_date`; throws if no row matched                            |
| `softDelete(id)`     | sets `_delete_date`; the row stays                                       |
| `restore(id)`        | clears it                                                                |
| `query(fn)`          | hands over the Kysely instance                                           |

`insert` reads back by `_ruid` rather than trusting an insert id, because the identity is the one
value known to be correct both before and after the write - and not every engine reports an
autoincrement id from inside a transaction.

`update` throwing on a missing row is deliberate. A silent no-op is how a screen shows a save that
never happened.

`findWhere` not hiding deleted rows is also deliberate: `list` is the read that respects the delete
date, while `findWhere` is a lookup, and a caller asking for a specific row wants to know it exists
rather than be told nothing matched.

## Extending it

`Repository` is an interface and `createRepository` returns a plain object, so an app that needs more
wraps it rather than configuring it:

```ts
export function createSyncRepository<T extends TableName<DB>>(table: T, deps: RepositoryDeps<DB>) {
  const base = createRepository<DB, T>(table, deps);
  return {
    ...base,
    // reads come free; only the write semantics differ
    async insert(row) {
      /* ...also stamp _sync_status */
    },
    async softDelete(id) {
      /* ...delete outright if the row never reached the server */
    },
  };
}
```

That is how a sync layer adds drafts, a status column and a server-aware delete without this package
growing an opinion about any of it.

## License

MIT
