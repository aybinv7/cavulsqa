import type { WorkerRequest, WorkerResponse, WorkerScope } from "../workerDialect.js";

/**
 * SQLite runs in a worker because OPFS synchronous access handles - the thing that makes
 * `opfs-sahpool` fast - are only available off the main thread. Keeping the database there is not a
 * workaround: a query no longer competes with rendering for the main thread either.
 */
export interface OpfsOpenPayload {
  /** The database file inside the pool's OPFS directory. */
  name: string;
  /**
   * Pool capacity, in files. It has to cover journals as well as databases, so the default is
   * generous rather than exact; it only applies the first time a pool is created.
   */
  capacity?: number;
  /**
   * The OPFS directory the pool owns. A pool takes its directory exclusively, so two browsing
   * contexts of one origin - two tabs of a web app - cannot open the same one: give each its own.
   * Omitted, the pool uses sqlite-wasm's default directory, which is where existing databases live;
   * changing it later orphans them rather than moving them.
   */
  directory?: string;
}

export type OpfsRequest = WorkerRequest<OpfsOpenPayload>;
export type OpfsResponse = WorkerResponse;
export type OpfsWorkerScope = WorkerScope<OpfsOpenPayload>;
