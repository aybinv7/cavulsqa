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

## Install

```bash
vp install @cavulsqa/mobile-db kysely @capacitor/core @capacitor-community/sqlite capacitor-sqlite-kysely
```
