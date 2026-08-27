import {
  isStorageId,
  opfsSahPool,
  waAccessHandlePool,
  waIdbBatchAtomic,
  waOriginPrivateFileSystem,
  STORAGE_IDS,
  type StorageCandidate,
} from "@/shared/database/candidates";

/**
 * The knob. Walked in order, first candidate that opens wins, and the rest are never imported - so a
 * chain that stops at the first entry never downloads wa-sqlite's wasm.
 *
 * Reorder freely to trade speed for reach: `waIdbBatchAtomic` first is the compatibility choice,
 * since IndexedDB is the only durable route on a WebView between Chromium 86 and 108. Only
 * `sqlite-wasm-opfs-sahpool` has been measured on a phone; the rest carry `evidence: "expected"`.
 *
 * No in-memory entry on purpose: a chain that ends somewhere data is not kept is worse than one that
 * fails and names every attempt.
 */
export const DEFAULT_ORDER: StorageCandidate[] = [
  opfsSahPool,
  waAccessHandlePool,
  waOriginPrivateFileSystem,
  waIdbBatchAtomic,
];

/**
 * `VITE_STORAGE_ENGINE` promotes one candidate to the front and leaves the rest as fallback, so the
 * env var reorders the chain rather than replacing it - a device that cannot open the preferred
 * engine still gets a working app.
 *
 * A typo is reported and ignored rather than fatal: it should not brick the build's output, but a
 * setting that was silently dropped looks exactly like one that was applied and did nothing.
 */
function preferredFirst(candidates: StorageCandidate[]): StorageCandidate[] {
  const preferred = import.meta.env.VITE_STORAGE_ENGINE;
  if (!preferred) return candidates;

  if (!isStorageId(preferred)) {
    console.warn(
      `[storage] VITE_STORAGE_ENGINE="${preferred}" is not an engine this app has. ` +
        `Expected one of: ${STORAGE_IDS.join(", ")}. Falling back to the default order.`,
    );
    return candidates;
  }

  const match = candidates.find((candidate) => candidate.id === preferred);
  return match ? [match, ...candidates.filter((candidate) => candidate !== match)] : candidates;
}

export const storageChain: StorageCandidate[] = preferredFirst(DEFAULT_ORDER);
