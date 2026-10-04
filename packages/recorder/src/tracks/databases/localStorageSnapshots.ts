import type {
  LocalStorageCapuData,
  LocalStorageCapuEntry,
  LocalStorageSnapshotReason,
} from "../../capu/types.js";

/** Snapshot cap: entries beyond this cumulative byte budget are replaced with `[truncated]`. */
export const MAX_SNAPSHOT_BYTES = 256 * 1024;

/** Debounce window for coalescing bursts of `setItem`/`removeItem`/`clear`/`storage` calls. */
export const DEFAULT_DEBOUNCE_MS = 250;

/** Default mask: keys containing `token`, `secret`, `password` or `auth` (case-insensitive). */
const DEFAULT_MASK_PATTERN = /token|secret|password|auth/i;

/**
 * The default `maskKeys` predicate used when a track does not supply its own: matches keys
 * containing `token`, `secret`, `password` or `auth`, case-insensitively.
 */
export function defaultMaskKeys(key: string): boolean {
  return DEFAULT_MASK_PATTERN.test(key);
}

export interface LocalStorageSnapshotOptions {
  /** Receives one snapshot per `initial`, debounced `change`, and `stop()`'s `final`. */
  onSnapshot: (data: LocalStorageCapuData) => void;
  /** Replaces the value of a matching key with `[masked]`. Defaults to {@link defaultMaskKeys}. */
  maskKeys?: (key: string) => boolean;
  /** Defaults to {@link DEFAULT_DEBOUNCE_MS}. */
  debounceMs?: number;
  /** Defaults to {@link MAX_SNAPSHOT_BYTES}. */
  maxBytes?: number;
  /** Defaults to `window.localStorage`. */
  storage?: Storage;
  /** Defaults to `window`; receives the `storage` event fired by other same-origin documents. */
  target?: EventTarget;
}

export interface LocalStorageSnapshotHandle {
  /** Restores the storage's `setItem`/`removeItem`/`clear`, removes the `storage` listener, and writes the `final` snapshot. */
  stop(): void;
}

function byteLength(value: string): number {
  if (typeof TextEncoder === "undefined") return value.length;
  return new TextEncoder().encode(value).length;
}

function readEntries(
  storage: Storage,
  maskKeys: (key: string) => boolean,
  maxBytes: number,
): LocalStorageCapuEntry[] {
  const entries: LocalStorageCapuEntry[] = [];
  let total = 0;
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key === null) continue;
    const raw = storage.getItem(key) ?? "";
    let value = maskKeys(key) ? "[masked]" : raw;
    total += byteLength(key) + byteLength(value);
    if (total > maxBytes) {
      value = "[truncated]";
    }
    entries.push({ key, value });
  }
  return entries;
}

/**
 * Wraps `setItem`/`removeItem`/`clear` on the target `Storage` instance and listens for the
 * `storage` event so writes from other documents on the same origin are also observed, pushing a
 * `LocalStorageCapuData` snapshot on `initial`, on each debounced `change`, and on `stop()`'s
 * `final`.
 *
 * The wrap is applied as own properties on the `storage` instance itself, rather than reassigning
 * `Storage.prototype` directly, so it never also intercepts `sessionStorage`; `stop()` puts back
 * the bound original methods it captured at `start`.
 */
export function startLocalStorageSnapshots(
  options: LocalStorageSnapshotOptions,
): LocalStorageSnapshotHandle {
  const storage =
    options.storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  const target = options.target ?? (typeof window === "undefined" ? undefined : window);
  if (!storage) return { stop: () => {} };

  const maskKeys = options.maskKeys ?? defaultMaskKeys;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const maxBytes = options.maxBytes ?? MAX_SNAPSHOT_BYTES;
  const origin = typeof location === "undefined" ? "" : location.origin;

  let timer: ReturnType<typeof setTimeout> | undefined;

  function emit(reason: LocalStorageSnapshotReason): void {
    options.onSnapshot({
      kind: "localStorage",
      origin,
      entries: readEntries(storage as Storage, maskKeys, maxBytes),
      reason,
    });
  }

  function scheduleChange(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      emit("change");
    }, debounceMs);
  }

  const originalSetItem: Storage["setItem"] = storage.setItem.bind(storage) as Storage["setItem"];
  const originalRemoveItem: Storage["removeItem"] = storage.removeItem.bind(
    storage,
  ) as Storage["removeItem"];
  const originalClear: Storage["clear"] = storage.clear.bind(storage) as Storage["clear"];

  const mutable = storage as unknown as {
    setItem: Storage["setItem"];
    removeItem: Storage["removeItem"];
    clear: Storage["clear"];
  };

  mutable.setItem = (key: string, value: string): void => {
    originalSetItem(key, value);
    scheduleChange();
  };
  mutable.removeItem = (key: string): void => {
    originalRemoveItem(key);
    scheduleChange();
  };
  mutable.clear = (): void => {
    originalClear();
    scheduleChange();
  };

  function onStorageEvent(event: Event): void {
    const storageEvent = event as StorageEvent;
    if (storageEvent.storageArea === storage) scheduleChange();
  }
  target?.addEventListener("storage", onStorageEvent);

  emit("initial");

  return {
    stop(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      mutable.setItem = originalSetItem;
      mutable.removeItem = originalRemoveItem;
      mutable.clear = originalClear;
      target?.removeEventListener("storage", onStorageEvent);
      emit("final");
    },
  };
}
