/**
 * wa-sqlite ships no declarations for its wasm factories or its virtual file systems, so they are
 * declared here - narrowly, covering only what this engine calls.
 *
 * Written out rather than cast at the call site: three `as` casts against an implicit `any` would
 * have compiled just as well and told a later reader nothing about the shapes involved.
 */
declare module "wa-sqlite/dist/wa-sqlite.mjs" {
  const factory: () => Promise<unknown>;
  export default factory;
}

declare module "wa-sqlite/dist/wa-sqlite-async.mjs" {
  const factory: () => Promise<unknown>;
  export default factory;
}

declare module "wa-sqlite/src/examples/AccessHandlePoolVFS.js" {
  /** OPFS through a pool of pre-opened synchronous access handles. Runs on the plain wasm build. */
  export class AccessHandlePoolVFS {
    constructor(directoryPath: string);
    /** Resolves once the pool has claimed its handles; a query before that fails. */
    readonly isReady: Promise<unknown>;
  }
}

declare module "wa-sqlite/src/examples/OriginPrivateFileSystemVFS.js" {
  /** OPFS without the pool, so it needs the Asyncify build. */
  export class OriginPrivateFileSystemVFS {
    constructor();
  }
}

declare module "wa-sqlite/src/examples/IDBBatchAtomicVFS.js" {
  /** SQLite pages in IndexedDB - the only durable option without synchronous access handles. */
  export class IDBBatchAtomicVFS {
    constructor(idbDatabaseName?: string);
  }
}
