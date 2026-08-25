import type { Kysely, Selectable } from "kysely";
import { nowISO } from "@cavulsqa/mobile-db";
import { getDatabase } from "@/shared/database/database";
import type { Database, NoteTable } from "@/shared/database/schema";

export type Note = Selectable<NoteTable>;

/**
 * Reads go straight to the database; only writes need the reactive wrapper, because only writes
 * have to announce which tables they touched.
 */
export function listNotes(): Promise<Note[]> {
  return getDatabase().db.selectFrom("note").selectAll().orderBy("id", "desc").execute();
}

export async function createNote(
  db: Kysely<Database>,
  values: { title: string; body: string },
): Promise<void> {
  await db
    .insertInto("note")
    .values({ ...values, created_at: nowISO() })
    .execute();
}
