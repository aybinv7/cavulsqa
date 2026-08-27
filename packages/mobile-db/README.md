# @cavulsqa/mobile-db

SQLite for [Kysely](https://kysely.dev) on a phone: WebAssembly in a worker, against a real file in
the Origin Private File System. No native plugin, and the same engine in a browser as on a device.

- `createOpfsDialect` + `runOpfsWorker` — the engine. Official `@sqlite.org/sqlite-wasm`, the
  `opfs-sahpool` VFS.
- `createWaDialect` + `runWaWorker` — `wa-sqlite`, three VFS choices, one of them IndexedDB. The
  reach option: the only durable route on a WebView too old for synchronous access handles.
- `createWorkerDialect` — what both are built on. Concurrent reads, serialised writes, a request
  timeout, and a channel that fails loudly instead of hanging.
- `migrateIfNeeded` — migrates, and skips the migrator entirely when there is nothing to do.
- `runWrite` — wraps a write in a transaction, emits a table-change event per touched table, and
  reports success or failure to an optional telemetry sink.
- `composeMigrations` — combines migration sets into one ordered `MigrationSet`.
- `ensureColumns` — additive column migration checked against `pragma_table_info`.
- `statementFacts` — what a statement does, read off the tree kysely compiled rather than its text.
- Column helpers — `createTableWithDefaults` (`id` + `created_at`), `formatTableName`,
  `defineTableColumns`, `nowISO`.
- `@cavulsqa/mobile-db/testing` — `createSqlJsDialect`, so the above can be tested without a device.

There is no sync contract here: no `_ruid`, no `_sync_status`, no push/pull queue.

## Entry points

| Import                        | What it gives you                                         |
| ----------------------------- | --------------------------------------------------------- |
| `@cavulsqa/mobile-db`         | Migrations, writes, column helpers, `createWorkerDialect` |
| `@cavulsqa/mobile-db/opfs`    | `createOpfsDialect` + `runOpfsWorker`                     |
| `@cavulsqa/mobile-db/wa`      | `createWaDialect` + `runWaWorker`                         |
| `@cavulsqa/mobile-db/testing` | `createSqlJsDialect`                                      |

## Wiring an engine

A library cannot ship a worker an arbitrary bundler will build, so the application owns a three-line
worker file and the logic stays here:

```ts
// src/db/opfs.worker.ts
import { runOpfsWorker } from "@cavulsqa/mobile-db/opfs";
runOpfsWorker();
```

```ts
import { createOpfsDialect } from "@cavulsqa/mobile-db/opfs";
import OpfsWorker from "./db/opfs.worker?worker";

const dialect = createOpfsDialect({ worker: new OpfsWorker(), name: "app.sqlite3" });
```

`createWaDialect` takes the same shape plus a `kind`, which picks the VFS **and** the wasm build:
`access-handle-pool` runs on the plain build, `origin-private-file-system` and `idb-batch-atomic`
need the Asyncify one. Loading the wrong pair fails at the first query, not at startup.

## Concurrency

Reads run concurrently; writes and transactions take a lock.

`SqliteAdapter` reports `supportsMultipleConnections === false`, and kysely answers that by putting
every connection acquisition behind a mutex — so statement N+1 was not even _posted_ to the worker
until N's reply came back. The channel matches replies by id precisely so several can be in flight,
and the worker runs them back to back with no main-thread hop between. Measured on a device, leaving
that mutex in place cost a `Promise.all` screen about 1.9x. This dialect reports `true` and handles
its own concurrency instead.

Writes still serialise, because one SQLite connection has one transaction: a standalone write
landing between another transaction's `begin` and `commit` is absorbed into it and rolled back with
it.

A statement that goes unanswered for **30 s** (`requestTimeoutMs`) rejects. Android can freeze or
kill a backgrounded app's worker, and without a limit every request in flight — and every one after
it — waits forever on a reply that is never coming.

## journal_mode

Ask, then **read back what you got**. WAL needs shared memory, which the OPFS access-handle-pool VFS
does not provide, and `PRAGMA journal_mode = WAL` does not fail when it cannot honour you — it
returns the mode you actually have. Asking without reading left a database in `delete`, the slowest
journal mode there is, while the code looked like it had asked for the fastest. `TRUNCATE` is the
right target on OPFS.

## Reads and writes are told apart by the compiled tree

`compiledQuery.query.kind`, not the SQL text. Matching on the text sent
`insert into t select ... from u` down the read path, where it reported no change count — and
`delete ... where id in (select ...)` with it.

## kysely 0.29

`Migrator` and the `Migration` type live at `kysely/migration` from 0.29 onwards; 0.28 had them at
the root and has no such subpath, so one import cannot serve both. This package targets **0.29+**.

## Install

```bash
vp install @cavulsqa/mobile-db kysely @sqlite.org/sqlite-wasm
```

`wa-sqlite` and `sql.js` are optional peers — add them only if you use that engine or the test
dialect.
