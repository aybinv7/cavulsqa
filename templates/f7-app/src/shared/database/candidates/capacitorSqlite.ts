import { Capacitor } from "@capacitor/core";
import type { StorageCandidate, StorageProbe } from "./types";

/**
 * `@capacitor-community/sqlite`: a real file behind a native bridge.
 *
 * Slower than the OPFS engine on every axis measured on a device - batched writes about 2.4x, the
 * app's own screen queries about 1.3x - and it needs the plugin in the APK. It is here for the one
 * thing the worker cannot do: the worker is serial, so a read waits behind an in-flight write,
 * where this dialect keeps reads outside the write lock. Choose it for an app that writes
 * continuously while the UI reads, or that needs SQLCipher or native access to the file.
 */
function probeNativePlatform(): StorageProbe {
  if (!Capacitor.isNativePlatform()) {
    return {
      supported: false,
      reason: "the SQLite plugin is native-only; on web it needs jeep-sqlite and a separate store",
    };
  }
  return { supported: true };
}

export const capacitorSqlite: StorageCandidate = {
  id: "capacitor-sqlite",
  label: "Capacitor SQLite · native plugin",
  tradeoff:
    "Needs the native plugin in the APK, and every statement crosses the bridge. Slower than the " +
    "worker engines, but reads are not blocked by an in-flight write.",
  durable: true,
  evidence: "measured",
  probe: probeNativePlatform,
  createDialect: async () => {
    const { createCapacitorDialect } = await import("@cavulsqa/mobile-db/capacitor");
    return await createCapacitorDialect({ name: "app.sqlite3" });
  },
};
