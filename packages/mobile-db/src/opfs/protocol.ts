/**
 * The messages the OPFS worker understands.
 *
 * SQLite runs in a worker because OPFS synchronous access handles - the thing that makes
 * `opfs-sahpool` fast - are only available off the main thread. Keeping the database there is not
 * a workaround: a query no longer competes with rendering for the main thread either.
 */
export interface OpfsOpenRequest {
  id: number;
  type: "open";
  /** The database file inside the pool's OPFS directory. */
  name: string;
  /**
   * Pool capacity, in files. It has to cover journals as well as databases, so the default is
   * generous rather than exact; it only applies the first time a pool is created.
   */
  capacity?: number;
}

export interface OpfsExecRequest {
  id: number;
  type: "exec";
  sql: string;
  parameters: readonly unknown[];
}

export type OpfsRequest = OpfsOpenRequest | OpfsExecRequest;

export interface OpfsExecResult {
  rows: unknown[];
  /** `sqlite3_changes()` after the statement, for the caller that needs to know it matched. */
  numAffectedRows: number;
  /** `sqlite3_last_insert_rowid()`, reported only for an insert. */
  insertId: number | null;
}

export type OpfsResponse =
  | { id: number; ok: true; result: OpfsExecResult | null }
  | { id: number; ok: false; error: string };

/** `Omit` collapses a union; this keeps each member's own shape. */
export type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

/**
 * What the worker half needs from its global scope, declared rather than imported: the
 * `DedicatedWorkerGlobalScope` type lives in the `webworker` lib, which cannot be enabled next to
 * `dom` - and this package needs `dom` for the `Worker` handle on the other side of the channel.
 */
export interface OpfsWorkerScope {
  postMessage: (message: OpfsResponse) => void;
  onmessage: ((event: { data: OpfsRequest }) => void) | null;
}
