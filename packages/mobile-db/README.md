# @cavulsqa/mobile-db

Capacitor SQLite persistence for [Kysely](https://kysely.dev).

- `createMobileDatabase` — opens a `@capacitor-community/sqlite` connection, applies the WAL /
  synchronous pragma set on every open, runs migrations, and returns a typed Kysely instance
  alongside a transaction-aware `write()`.
- `SharedConnectionSQLiteDialect` — a Kysely dialect over one shared native connection, with
  optional `serializeAccess` to serialize statements and transactions.
- `runWrite` — wraps a write in a transaction, emits a table-change event per touched table, and
  reports success or failure to an optional telemetry sink.
- `composeMigrations` — combines migration sets into one ordered `MigrationSet`.
- `ensureColumns` — additive column migration checked against `pragma_table_info`.
- Column helpers — `createTableWithDefaults` (`id` + `created_at`), `formatTableName`,
  `defineTableColumns`, `nowISO`.
- `@cavulsqa/mobile-db/testing` — `createSqlJsDialect`, so the above can be tested without a
  device. Requires `sql.js` as an optional peer.

There is no sync contract here: no `_ruid`, no `_sync_status`, no push/pull queue.

## kysely 0.29

`Migrator` and the `Migration` type live at `kysely/migration` from 0.29 onwards; 0.28 had them at
the root and has no such subpath, so one import cannot serve both. This package targets **0.29+**.
Use `@cavulsqa/mobile-db@0.1.1` if you are pinned to kysely 0.28.

0.29 also serialises every connection acquisition when the adapter reports
`supportsMultipleConnections === false`, which `SqliteAdapter` does. This dialect reports `true`
instead and keeps its own finer-grained lock: writes and transactions serialise, reads do not.
Letting kysely's mutex take over would queue reads behind writes and cost several times the latency
on a screen that loads with `Promise.all`.

## Install

```bash
vp install @cavulsqa/mobile-db kysely @capacitor/core @capacitor-community/sqlite capacitor-sqlite-kysely
```
