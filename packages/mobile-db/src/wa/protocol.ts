/**
 * Which wa-sqlite virtual file system to mount.
 *
 * The choice also decides which wasm build gets loaded, and they are not interchangeable:
 * `access-handle-pool` is synchronous and runs on the plain build, while the two OPFS/IndexedDB
 * VFSes below it need the Asyncify build - the one that lets a JavaScript VFS await inside a call
 * SQLite believes is synchronous. Loading the wrong pair fails at the first query, not at startup,
 * so the mapping lives here rather than at the call site.
 *
 * Note for anyone who read that `OPFSCoopSyncVFS` is the concurrency answer: it is not in
 * wa-sqlite 1.0.0. What ships is the list below.
 */
export type WaVfsKind = "access-handle-pool" | "origin-private-file-system" | "idb-batch-atomic";

export function needsAsyncBuild(kind: WaVfsKind): boolean {
  return kind !== "access-handle-pool";
}

export interface WaOpenRequest {
  id: number;
  type: "open";
  kind: WaVfsKind;
  /** The database name, and for the pool VFSes also the directory it owns. */
  name: string;
}

export interface WaExecRequest {
  id: number;
  type: "exec";
  sql: string;
  parameters: readonly unknown[];
}

export type WaRequest = WaOpenRequest | WaExecRequest;

export interface WaExecResult {
  rows: unknown[];
  numAffectedRows: number;
  /** `last_insert_rowid()`, reported only for an insert. */
  insertId: number | null;
}

export type WaResponse =
  | { id: number; ok: true; result: WaExecResult | null }
  | { id: number; ok: false; error: string };

/** `Omit` collapses a union; this keeps each member's own shape. */
export type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

/**
 * Declared rather than imported, for the same reason as the OPFS engine's: the
 * `DedicatedWorkerGlobalScope` type lives in the `webworker` lib, which cannot be enabled next to
 * `dom`, and this package needs `dom` for the `Worker` handle on the other side.
 */
export interface WaWorkerScope {
  postMessage: (message: WaResponse) => void;
  onmessage: ((event: { data: WaRequest }) => void) | null;
}
