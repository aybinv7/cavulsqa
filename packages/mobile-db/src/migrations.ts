import type { Kysely } from "kysely";
import { sql } from "kysely";
import { Migrator, type Migration } from "kysely/migration";

export type MigrationSet = Record<string, Migration>;

export function composeMigrations(sets: MigrationSet[]): MigrationSet {
  const merged: MigrationSet = {};

  for (const set of sets) {
    for (const [name, migration] of Object.entries(set)) {
      if (name in merged) {
        throw new Error(`Duplicate migration name: ${name}`);
      }
      merged[name] = migration;
    }
  }

  return merged;
}

/**
 * Reads the migration table and answers whether anything is left to run.
 *
 * `migrateToLatest()` introspects the whole schema before it decides there is nothing to do - on a
 * 119-table database that measured about 550ms of every launch, in two full passes. One read of the
 * names already applied answers the same question. Any failure here (a first run, where the table
 * does not exist yet) falls through to the migrator.
 */
async function everyMigrationApplied<DB>(
  db: Kysely<DB>,
  migrations: MigrationSet,
): Promise<boolean> {
  const wanted = Object.keys(migrations);
  if (wanted.length === 0) return true;

  try {
    const applied = await sql<{ name: string }>`SELECT name FROM kysely_migration`.execute(db);
    const names = new Set(applied.rows.map((row) => row.name));
    return wanted.every((name) => names.has(name));
  } catch {
    return false;
  }
}

/**
 * Migrates, skipping the migrator entirely when there is nothing to do.
 *
 * Engine-independent on purpose. This lived inside the Capacitor path, so an app on a worker engine
 * silently paid the full introspection on every launch - which read as the engine being four times
 * slower to open when it was nothing of the sort.
 *
 * `migrateToLatest` reports failure in its return value rather than throwing, so an unchecked call
 * boots an app whose tables were never created and fails later as "no such table".
 */
export async function migrateIfNeeded<DB>(db: Kysely<DB>, migrations: MigrationSet): Promise<void> {
  if (await everyMigrationApplied(db, migrations)) return;

  const { error, results } = await new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
    migrationTableName: "kysely_migration",
    migrationLockTableName: "kysely_migration_lock",
  }).migrateToLatest();

  if (error) {
    const failed = results?.find((result) => result.status === "Error")?.migrationName;
    const detail = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`migration failed${failed ? ` at ${failed}` : ""}: ${detail}`);
  }
}
