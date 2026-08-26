import { opfsSahPool, sqlJsMemory, type StorageCandidate } from "@/shared/database/candidates";

/**
 * Which SQLite implementation this app uses, and what it falls back to.
 *
 * This is the knob. The list is walked in order: each candidate is asked whether the device supports
 * it, then asked to open; the first that succeeds wins, and the rest are never imported - so a chain
 * that never reaches wa-sqlite never downloads its wasm.
 *
 * Ordered fastest-first, which is a claim worth being precise about. Only `sqlite-wasm-opfs-sahpool`
 * has been measured on a device; anything below it is placed on the vendors' own descriptions, and
 * each candidate says which it is through `evidence`. Reorder freely - putting a compatible engine
 * first is a legitimate choice, and the app reports which one actually opened either way.
 *
 * Candidates that exist but are not wired up yet, in the order they belong:
 *
 * 1. `wa-sqlite-opfs-coop-sync` - OPFS through wa-sqlite's OPFSCoopSyncVFS, which queues concurrent
 *    access through the Web Locks API instead of failing on an exclusive lock. Expected to lose a
 *    little raw speed to Asyncify and win the case this app measured as its one regression: a read
 *    issued while a write is in flight. The candidate to try for a sync-heavy app.
 * 2. `wa-sqlite-access-handle-pool` - the same shape as the pool above, from the other vendor.
 * 3. `wa-sqlite-idb-batch-atomic` - SQLite over IndexedDB. Slower than any OPFS route and the only
 *    durable option on a WebView between Chromium 86 and 108, which runs this app's bundle fine but
 *    has no stable synchronous access handles.
 */
export const storageChain: StorageCandidate[] = [opfsSahPool, sqlJsMemory];
