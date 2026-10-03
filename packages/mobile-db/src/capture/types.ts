/** A column of a captured table, as `pragma_table_info` reports it. `pk` is its 1-based position in the key, 0 when not part of it. */
export interface CapturedColumn {
  name: string;
  type: string;
  pk: number;
}

/** A table the capture is attached to. Changesets carry column positions only, so the reader needs this to name them. */
export interface CapturedTable {
  name: string;
  columns: CapturedColumn[];
  /** The session extension ignores a table without a declared PRIMARY KEY. */
  tracked: boolean;
}

/** Which tables to capture: a list, or every table including ones created later. */
export type CaptureTables = readonly string[] | "all";

export type CaptureReply =
  | { supported: true; tables: CapturedTable[] }
  | { supported: false; reason: string };

/** One committed transaction, in SQLite's own changeset format. */
export interface Changeset {
  bytes: Uint8Array;
  /** Wall-clock milliseconds at which the worker collected it. */
  at: number;
}

export type ChangesetListener = (changeset: Changeset) => void;
