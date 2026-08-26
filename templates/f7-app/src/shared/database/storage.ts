/**
 * How SQLite is persisted, as an ordered list of candidates.
 *
 * There is one tier today and the list exists anyway, because the failure it guards against is not
 * hypothetical: the OPFS SAH pool takes an *exclusive* lock on its directory, so a crash that left
 * a handle open, or a second WebView on the same origin, makes the open fail outright. A list makes
 * that recoverable later by adding a tier rather than rewriting the open path.
 *
 * What is deliberately *not* here:
 *
 * - The Capacitor plugin. It is a fine engine - measured slightly better than OPFS at single
 *   unbatched writes and at reading during a write - but keeping it means keeping a native
 *   dependency and the plugin in the APK. Apps that need SQLCipher, native-side access to the file,
 *   or that write continuously while the UI reads should import `createMobileDatabase` from
 *   `@cavulsqa/mobile-db` and use it instead.
 * - An IndexedDB VFS. The official sqlite-wasm build does not ship one; its only non-OPFS durable
 *   option is `kvvfs`, which is localStorage and caps out around 5 MB. A real IndexedDB tier means
 *   a second SQLite build (`wa-sqlite`'s `IDBBatchAtomicVFS`) and roughly another megabyte of wasm.
 *   It would not rescue an old WebView either - this app's bundle targets `esnext`, so a browser
 *   without synchronous access handles cannot run it at all. Worth adding only for the exclusive
 *   lock case above, which is why the slot is documented rather than filled.
 */
export type StorageTier = "opfs";

export interface StorageProbe {
  supported: boolean;
  /** Present when unsupported, phrased so the person reading it can act on it. */
  reason?: string;
}

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
export function probeOpfs(): StorageProbe {
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

export function storageLabel(tier: StorageTier): string {
  return { opfs: "SQLite WASM over OPFS (worker)" }[tier];
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
 * Synchronous access handles - what the SAH pool needs - landed in Chromium 102. OPFS itself arrived
 * in 86. Below 102 there is no durable storage for this engine at all.
 *
 * It is a floor, not a guarantee: a vendor WebView build can differ, which is why the app probes and
 * wraps the real failure instead of trusting this number to decide anything.
 */
export const MINIMUM_CHROMIUM_FOR_OPFS = 102;

export function webviewLikelyTooOld(): boolean {
  const version = webviewVersion();
  return version !== null && version < MINIMUM_CHROMIUM_FOR_OPFS;
}
