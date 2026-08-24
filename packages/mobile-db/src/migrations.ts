import type { Migration } from "kysely";

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
