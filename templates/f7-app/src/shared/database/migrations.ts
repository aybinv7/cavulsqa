import { createTableWithDefaults, type MigrationSet } from "@cavulsqa/mobile-db";

/**
 * Keys are ordered lexically and recorded once applied, so they are numbered and never renamed:
 * renaming one makes it run again on a database that already has it.
 */
export const migrations: MigrationSet = {
  "001_note": {
    up: async (db) => {
      await createTableWithDefaults(db, "note")
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("body", "text", (col) => col.notNull().defaultTo(""))
        .execute();
    },
  },
};
