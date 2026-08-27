import type { WorkerRequest, WorkerResponse, WorkerScope } from "../workerDialect.js";

/**
 * Which wa-sqlite virtual file system to mount.
 *
 * The choice also decides which wasm build gets loaded, and they are not interchangeable:
 * `access-handle-pool` is synchronous and runs on the plain build, while the two below it need the
 * Asyncify build - the one that lets a JavaScript VFS await inside a call SQLite believes is
 * synchronous. Loading the wrong pair fails at the first query, not at startup, so the mapping lives
 * here rather than at the call site.
 *
 * Note for anyone who read that `OPFSCoopSyncVFS` is the concurrency answer: it is not in
 * wa-sqlite 1.0.0. What ships is the list below.
 */
export type WaVfsKind = "access-handle-pool" | "origin-private-file-system" | "idb-batch-atomic";

export function needsAsyncBuild(kind: WaVfsKind): boolean {
  return kind !== "access-handle-pool";
}

export interface WaOpenPayload {
  /** The database name, and for the pool VFSes also the directory it owns. */
  name: string;
  kind: WaVfsKind;
}

export type WaRequest = WorkerRequest<WaOpenPayload>;
export type WaResponse = WorkerResponse;
export type WaWorkerScope = WorkerScope<WaOpenPayload>;
