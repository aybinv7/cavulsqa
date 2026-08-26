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
 * Synchronous access handles are the thing the SAH pool needs, and they are Worker-only in
 * Chromium - so the check is for the interface, not for a working handle. An actual failure to open
 * is reported by the open itself, with the engine's own message.
 */
export function probeOpfs(): StorageProbe {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return {
      supported: false,
      reason: "This WebView has no Origin Private File System, so the database cannot be stored.",
    };
  }

  if (
    typeof FileSystemFileHandle === "undefined" ||
    !("createSyncAccessHandle" in FileSystemFileHandle.prototype)
  ) {
    return {
      supported: false,
      reason:
        "This WebView is too old for synchronous file access. Update Android System WebView from " +
        "the Play Store - it updates separately from Android itself.",
    };
  }

  return { supported: true };
}

export function storageLabel(tier: StorageTier): string {
  return { opfs: "SQLite WASM over OPFS (worker)" }[tier];
}
