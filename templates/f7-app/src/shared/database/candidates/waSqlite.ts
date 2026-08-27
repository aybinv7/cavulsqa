import { createWaDialect, type WaVfsKind } from "@cavulsqa/mobile-db/wa";
import WaWorker from "../wa.worker?worker";
import { probeIndexedDb, probeOpfsCapable } from "../storage";
import type { StorageCandidate } from "./types";

/**
 * wa-sqlite, once per virtual file system.
 *
 * The alternative to the official build, and the reason it is here: its VFS layer is JavaScript, so
 * it reaches storage the official engine has no VFS for. IndexedDB in particular is the only durable
 * option on a WebView too old for synchronous access handles - the Chromium 86 to 108 band, which
 * runs this app's bundle perfectly well.
 *
 * All three share one worker file and one dialect; only `kind` differs, and it also decides which of
 * wa-sqlite's two wasm builds gets loaded.
 */
function waCandidate(
  kind: WaVfsKind,
  fields: Pick<StorageCandidate, "id" | "label" | "tradeoff" | "probe">,
): StorageCandidate {
  return {
    ...fields,
    durable: true,
    // Nothing below the official pool has been on a phone yet.
    evidence: "expected",
    createDialect: () =>
      Promise.resolve(createWaDialect({ worker: new WaWorker(), name: "app-wa.sqlite3", kind })),
  };
}

export const waAccessHandlePool = waCandidate("access-handle-pool", {
  id: "wa-sqlite-access-handle-pool",
  label: "wa-sqlite · OPFS access handle pool",
  tradeoff:
    "The same exclusive directory lock as the official pool, and the same serial worker. Here to " +
    "measure one vendor's pool against the other's on identical storage.",
  probe: probeOpfsCapable,
});

export const waOriginPrivateFileSystem = waCandidate("origin-private-file-system", {
  id: "wa-sqlite-opfs-async",
  label: "wa-sqlite · OPFS, no pool",
  tradeoff:
    "Runs on the Asyncify build, which wraps every call SQLite believes is synchronous - expected " +
    "to cost raw speed and to handle concurrent access more gracefully than a pool that locks.",
  probe: probeOpfsCapable,
});

export const waIdbBatchAtomic = waCandidate("idb-batch-atomic", {
  id: "wa-sqlite-idb-batch-atomic",
  label: "wa-sqlite · IndexedDB",
  tradeoff:
    "The slowest durable route: pages go through IndexedDB transactions rather than to a file. The " +
    "only one that works without synchronous access handles at all.",
  probe: probeIndexedDb,
});
