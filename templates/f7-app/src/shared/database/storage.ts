import type { StorageProbe } from "./candidates/types";

export type { StorageProbe };

/**
 * Capability checks and failure diagnosis, shared by the candidates.
 *
 * The chain itself lives in `app/storage.config.ts` and each engine in `candidates/`; this is only
 * the part they have in common - deciding whether a device can host OPFS at all, and turning an
 * engine's failure into a sentence somebody can act on.
 */

/**
 * Only what the main thread can honestly observe.
 *
 * The tempting check - `"createSyncAccessHandle" in FileSystemFileHandle.prototype` - is wrong here
 * and rejected a phone on WebView 150 that had been running OPFS happily: synchronous access handles
 * are Worker-only in Chromium, so the method is absent from the main-thread prototype on *every*
 * device, new or old. `navigator.storage.getDirectory` is visible from both scopes, so that is the
 * whole of what can be pre-checked.
 *
 * Anything finer belongs to the engine. `describeOpenFailure` turns its error into something a
 * person can act on, which is what the pre-check was reaching for in the first place.
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

/**
 * The engine is the authority on whether it can open, so its failure is wrapped rather than
 * predicted. A missing synchronous access handle surfaces from inside wasm initialisation, where the
 * message names an internal symbol and not the thing to do about it.
 */
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
 * The Chromium version behind this WebView, which is the number that decides whether OPFS works.
 *
 * Worth surfacing rather than reasoning about: Android System WebView updates from the Play Store
 * independently of Android itself, so the OS version says nothing useful. A phone on Android 7 with
 * a current WebView is fine; a phone on Android 14 that has never reached the Play Store may not be.
 */
export function webviewVersion(): number | null {
  if (typeof navigator === "undefined") return null;
  const match = /Chrome\/(\d+)/.exec(navigator.userAgent);
  return match ? Number(match[1]) : null;
}

/**
 * OPFS arrived in Chromium 86, synchronous access handles followed, and the combination is reported
 * stable in WebView from 109. 109 is used rather than the earlier number because this value only
 * ever produces advice: too low and a phone in the gap is told its WebView is fine before failing
 * anyway, while too high only ever suggests an update that does no harm.
 *
 * A floor, never a gate. A vendor WebView build can differ either way, so the app probes and wraps
 * the engine's real failure rather than letting this number decide anything.
 */
export const MINIMUM_CHROMIUM_FOR_OPFS = 109;

export function webviewLikelyTooOld(): boolean {
  const version = webviewVersion();
  return version !== null && version < MINIMUM_CHROMIUM_FOR_OPFS;
}
