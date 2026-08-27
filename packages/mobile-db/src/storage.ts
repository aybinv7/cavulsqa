/**
 * A union rather than an optional field, so an unsupported probe cannot forget its reason and a
 * supported one cannot carry a stale one.
 */
export type StorageProbe = { supported: true } | { supported: false; reason: string };

/**
 * `navigator.storage.getDirectory` is the whole of what a main-thread probe can see. Synchronous
 * access handles are Worker-only in Chromium, so checking `createSyncAccessHandle` on
 * `FileSystemFileHandle.prototype` is false on *every* device - it rejected a phone that had been
 * running OPFS for hours. Anything finer belongs to the engine, via `describeOpenFailure`.
 */
export function probeOpfsCapable(): StorageProbe {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return {
      supported: false,
      reason:
        "This WebView has no Origin Private File System, so the database cannot be stored. Update " +
        "Android System WebView from the Play Store - it updates separately from Android itself.",
    };
  }
  return { supported: true };
}

export function probeIndexedDb(): StorageProbe {
  if (typeof indexedDB === "undefined") {
    return {
      supported: false,
      reason: "This WebView has no IndexedDB, which leaves nowhere to keep the database.",
    };
  }
  return { supported: true };
}

export function describeOpenFailure(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (/SyncAccessHandle|createSyncAccessHandle|sahpool|SAH/i.test(detail)) {
    return (
      "SQLite could not take a synchronous file handle. Either this WebView is too old - update " +
      "Android System WebView from the Play Store, it updates separately from Android - or another " +
      `copy of the app still holds the database open. (${detail})`
    );
  }

  return `The database could not be opened: ${detail}`;
}

/**
 * Android System WebView updates from the Play Store independently of Android itself, so the OS
 * version says nothing useful here - a phone on Android 7 can be current and one on Android 14 old.
 */
export function webviewVersion(): number | null {
  if (typeof navigator === "undefined") return null;
  const match = /Chrome\/(\d+)/.exec(navigator.userAgent);
  return match ? Number(match[1]) : null;
}

/** Advice, never a gate: a vendor WebView build can differ either way, so the engine decides. */
export const MINIMUM_CHROMIUM_FOR_OPFS = 109;

export function webviewLikelyTooOld(): boolean {
  const version = webviewVersion();
  return version !== null && version < MINIMUM_CHROMIUM_FOR_OPFS;
}

/**
 * One way to persist SQLite, described well enough to choose between them without reading the code.
 *
 * A candidate owns its own capability check and its own lazy open, so a chain that never reaches the
 * third entry never downloads the third entry's wasm.
 */
export interface StorageCandidate<T> {
  id: string;
  label: string;
  probe: () => StorageProbe;
  open: () => Promise<T>;
}

export interface StorageAttempt {
  id: string;
  outcome: "opened" | "unsupported" | "failed";
  detail?: string;
}

export interface StorageChoice<T> {
  value: T;
  candidate: StorageCandidate<T>;
  attempts: StorageAttempt[];
}

export interface OpenFirstAvailableOptions {
  /**
   * One retry per candidate before moving on.
   *
   * The pool VFSes take an exclusive lock on their directory, and the usual reason it is held is a
   * process on its way out - a crash, or a relaunch racing the old WebView's teardown. Its handles
   * are released when that process dies, so the same open succeeds a moment later. Past one retry,
   * the chain moving on is the better answer.
   */
  retryDelayMs?: number;
}

const DEFAULT_RETRY_DELAY_MS = 400;

/**
 * Walks the chain and keeps the first candidate that opens.
 *
 * A candidate is skipped when it says the device cannot support it, and dropped when it says so by
 * throwing. Every step is recorded - which were skipped and why, which failed and with what -
 * because a silent fallback to a slower engine is the kind of thing that gets discovered weeks
 * later by someone wondering why the app is slow.
 */
export async function openFirstAvailable<T>(
  candidates: readonly StorageCandidate<T>[],
  options: OpenFirstAvailableOptions = {},
): Promise<StorageChoice<T>> {
  if (candidates.length === 0) throw new Error("[mobile-db] no storage candidates were given");
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const attempts: StorageAttempt[] = [];

  for (const candidate of candidates) {
    const probe = candidate.probe();
    if (!probe.supported) {
      attempts.push({ id: candidate.id, outcome: "unsupported", detail: probe.reason });
      continue;
    }

    try {
      const value = await openOnce(candidate, retryDelayMs);
      attempts.push({ id: candidate.id, outcome: "opened" });
      return { value, candidate, attempts };
    } catch (error) {
      attempts.push({ id: candidate.id, outcome: "failed", detail: describeOpenFailure(error) });
    }
  }

  // Every candidate's reason, because "the database would not open" on its own helps nobody.
  const summary = attempts
    .map((a) => `${a.id}: ${a.outcome}${a.detail ? ` - ${a.detail}` : ""}`)
    .join("; ");
  throw new Error(`[mobile-db] no storage engine could open the database. ${summary}`);
}

async function openOnce<T>(candidate: StorageCandidate<T>, retryDelayMs: number): Promise<T> {
  try {
    return await candidate.open();
  } catch (first) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    try {
      return await candidate.open();
    } catch {
      // The first error is the honest one; the retry's is a duplicate of it.
      throw first;
    }
  }
}
