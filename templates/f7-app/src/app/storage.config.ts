import {
  opfsSahPool,
  waAccessHandlePool,
  waIdbBatchAtomic,
  waOriginPrivateFileSystem,
  type StorageCandidate,
} from "@/shared/database/candidates";

/**
 * Which SQLite implementation this app uses, and what it falls back to.
 *
 * This is the knob. The list is walked in order: each candidate is asked whether the device supports
 * it, then asked to open; the first that succeeds wins, and the rest are never imported - so a chain
 * that stops at the first entry never downloads wa-sqlite's wasm at all.
 *
 * Ordered fastest-first, and that ordering is a claim worth being precise about. Only
 * `sqlite-wasm-opfs-sahpool` has been measured on a phone; the three below it are placed on the
 * vendor's own description of them and each says so through `evidence`. The Diagnostics benchmark
 * exists to replace that guess with numbers.
 *
 * Reorder freely - this is the supported way to trade speed for reach:
 *
 * - Compatibility first: put `waIdbBatchAtomic` at the top. IndexedDB is the only durable route on a
 *   WebView between Chromium 86 and 108, which runs this bundle but has no synchronous access
 *   handles. Slowest, works almost everywhere.
 * - One vendor only: drop `opfsSahPool` and keep the wa-sqlite three, or the reverse. Both engines
 *   implement the same dialect contract, so nothing above this file changes either way.
 *
 * There is deliberately no in-memory entry. A chain that silently ends somewhere data is not kept is
 * worse than one that fails and says why, and the error screen names every attempt.
 */
const DEFAULT_ORDER: StorageCandidate[] = [
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
 * An unknown id is ignored rather than fatal: a typo in a `.env` should not brick the build's
 * output, and the app reports which candidate actually opened in Settings.
 */
function preferredFirst(candidates: StorageCandidate[]): StorageCandidate[] {
  const preferred = import.meta.env.VITE_STORAGE_ENGINE;
  if (!preferred) return candidates;

  const match = candidates.find((candidate) => candidate.id === preferred);
  return match ? [match, ...candidates.filter((candidate) => candidate !== match)] : candidates;
}

export const storageChain: StorageCandidate[] = preferredFirst(DEFAULT_ORDER);
