/**
 * PRAGMAs applied to every engine, identically, right after it opens.
 *
 * They live here rather than inside a candidate for one reason: SQLite's defaults are per-build, and
 * two engines left on their own defaults are not comparable. Measuring them without pinning this
 * produced a 1.47x "ranking" that may have been nothing but a difference in `synchronous`.
 *
 * `fast` is what a benchmark should use - both engines pushed as hard as they go, so the comparison
 * is between engines rather than between journal settings. It is not a safe default for an app that
 * holds a day's orders: `synchronous = OFF` means the OS, not SQLite, decides when bytes reach
 * storage, so a crash or a battery pull can leave the database corrupt rather than merely stale.
 *
 * `safe` keeps SQLite's durability guarantee and pays for it on single writes, which the benchmark
 * measures at 19-57 ms depending on engine. Both settings batch equally well - inside one
 * transaction the cost per row falls under 3 ms either way - so an app that batches its writes gives
 * up very little by staying safe.
 */
export type PragmaProfile = "fast" | "safe";

const PROFILES: Record<PragmaProfile, readonly string[]> = {
  fast: [
    // No journal file to create, write and delete per transaction.
    "PRAGMA journal_mode = MEMORY",
    // The big one for single writes, and the one that trades away crash durability.
    "PRAGMA synchronous = OFF",
    "PRAGMA temp_store = MEMORY",
    // Negative means KiB rather than pages: 16 MB of page cache.
    "PRAGMA cache_size = -16000",
  ],
  safe: [
    "PRAGMA journal_mode = TRUNCATE",
    "PRAGMA synchronous = FULL",
    "PRAGMA temp_store = MEMORY",
    "PRAGMA cache_size = -16000",
  ],
};

/**
 * From `VITE_PRAGMA_PROFILE`, defaulting to `safe`.
 *
 * Safe by default because the cost is small once writes are batched - inside one transaction the
 * per-row difference is under a millisecond - and the failure it prevents is a corrupt database
 * rather than a slow one. Set `fast` when measuring, where the point is to compare engines rather
 * than journal settings.
 */
export const pragmaProfile: PragmaProfile =
  import.meta.env.VITE_PRAGMA_PROFILE === "fast" ? "fast" : "safe";

export function pragmasFor(profile: PragmaProfile): readonly string[] {
  return PROFILES[profile];
}
