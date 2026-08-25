import type { Generated } from "kysely";

/**
 * The shape Kysely type-checks every query against. Add a table here and a migration beside it;
 * the two together are the only places a table is defined.
 */
export interface NoteTable {
  id: Generated<number>;
  created_at: string;
  title: string;
  body: string;
}

export interface Database {
  note: NoteTable;
}
