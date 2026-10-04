import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import type { LocalStorageCapuData } from "../src/capu/types.js";
import { startLocalStorageSnapshots } from "../src/tracks/databases/localStorageSnapshots.js";

/**
 * happy-dom's `window.localStorage` cannot be monkey-patched (writes always reach its native
 * implementation regardless of any prototype or own-property override), so behavior that depends
 * on intercepting `setItem`/`removeItem`/`clear` is exercised against this in-memory stand-in
 * instead. It satisfies the `Storage` shape the track actually needs (`length`, `key`, `getItem`,
 * `setItem`, `removeItem`, `clear`).
 */
class FakeStorage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

function fakeStorage(): Storage {
  return new FakeStorage() as unknown as Storage;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function collect(): {
  snapshots: LocalStorageCapuData[];
  onSnapshot: (data: LocalStorageCapuData) => void;
} {
  const snapshots: LocalStorageCapuData[] = [];
  return { snapshots, onSnapshot: (data) => snapshots.push(data) };
}

test("emits an initial snapshot synchronously on start", () => {
  const storage = fakeStorage();
  storage.setItem("theme", "dark");
  const { snapshots, onSnapshot } = collect();

  const handle = startLocalStorageSnapshots({ storage, onSnapshot });

  expect(snapshots).toHaveLength(1);
  expect(snapshots[0]).toMatchObject({
    kind: "localStorage",
    reason: "initial",
    entries: [{ key: "theme", value: "dark" }],
  });

  handle.stop();
});

test("stop() writes a final snapshot", () => {
  const storage = fakeStorage();
  const { snapshots, onSnapshot } = collect();
  const handle = startLocalStorageSnapshots({ storage, onSnapshot });

  storage.setItem("theme", "light");
  handle.stop();

  const final = snapshots.at(-1);
  expect(final?.reason).toBe("final");
  expect(final?.entries).toEqual([{ key: "theme", value: "light" }]);
});

test("debounces a burst of writes into one change snapshot", () => {
  const storage = fakeStorage();
  const { snapshots, onSnapshot } = collect();
  const handle = startLocalStorageSnapshots({ storage, onSnapshot, debounceMs: 250 });

  storage.setItem("a", "1");
  vi.advanceTimersByTime(100);
  storage.setItem("a", "2");
  vi.advanceTimersByTime(100);
  storage.setItem("a", "3");
  vi.advanceTimersByTime(249);
  expect(snapshots.filter((s) => s.reason === "change")).toHaveLength(0);

  vi.advanceTimersByTime(1);
  const changes = snapshots.filter((s) => s.reason === "change");
  expect(changes).toHaveLength(1);
  expect(changes[0].entries).toEqual([{ key: "a", value: "3" }]);

  handle.stop();
});

test("removeItem and clear also schedule a debounced change", () => {
  const storage = fakeStorage();
  storage.setItem("a", "1");
  const { snapshots, onSnapshot } = collect();
  const handle = startLocalStorageSnapshots({ storage, onSnapshot });
  snapshots.length = 0;

  storage.removeItem("a");
  vi.advanceTimersByTime(250);
  expect(snapshots.filter((s) => s.reason === "change")).toHaveLength(1);

  storage.setItem("b", "2");
  vi.advanceTimersByTime(250);
  storage.clear();
  vi.advanceTimersByTime(250);
  const last = snapshots.at(-1);
  expect(last?.entries).toEqual([]);

  handle.stop();
});

test("masks keys matching the default pattern", () => {
  const storage = fakeStorage();
  storage.setItem("authToken", "secret-value");
  storage.setItem("username", "ayoub");
  const { snapshots, onSnapshot } = collect();

  const handle = startLocalStorageSnapshots({ storage, onSnapshot });

  const entries = snapshots[0].entries;
  expect(entries.find((e) => e.key === "authToken")?.value).toBe("[masked]");
  expect(entries.find((e) => e.key === "username")?.value).toBe("ayoub");

  handle.stop();
});

test("a custom maskKeys predicate replaces the default", () => {
  const storage = fakeStorage();
  storage.setItem("authToken", "secret-value");
  storage.setItem("customSecretish", "x");
  const { snapshots, onSnapshot } = collect();

  const handle = startLocalStorageSnapshots({
    storage,
    onSnapshot,
    maskKeys: (key) => key === "customSecretish",
  });

  const entries = snapshots[0].entries;
  expect(entries.find((e) => e.key === "authToken")?.value).toBe("secret-value");
  expect(entries.find((e) => e.key === "customSecretish")?.value).toBe("[masked]");

  handle.stop();
});

test("caps a snapshot at maxBytes and marks overflow entries truncated", () => {
  const storage = fakeStorage();
  storage.setItem("a", "x".repeat(50));
  storage.setItem("b", "y".repeat(50));
  storage.setItem("c", "z".repeat(50));
  const { snapshots, onSnapshot } = collect();

  const handle = startLocalStorageSnapshots({ storage, onSnapshot, maxBytes: 60 });

  const entries = snapshots[0].entries;
  expect(entries[0].value).toBe("x".repeat(50));
  expect(entries[1].value).toBe("[truncated]");
  expect(entries[2].value).toBe("[truncated]");

  handle.stop();
});

test("stop() restores plain reads/writes with no debounced change still pending", () => {
  const storage = fakeStorage();
  const patchedDuringStart = storage.setItem;

  const { snapshots, onSnapshot } = collect();
  const handle = startLocalStorageSnapshots({ storage, onSnapshot, debounceMs: 250 });
  expect(storage.setItem).not.toBe(patchedDuringStart);

  storage.setItem("a", "1");
  handle.stop();
  snapshots.length = 0;

  // No debounced "change" fires after stop(): the pending timer was cleared and the wrap removed.
  vi.advanceTimersByTime(1_000);
  expect(snapshots).toHaveLength(0);

  // Further writes behave like plain, unwrapped storage.
  storage.setItem("b", "2");
  expect(storage.getItem("b")).toBe("2");
  expect(snapshots).toHaveLength(0);
});

test("a storage event from another document schedules a debounced change", () => {
  const storage = fakeStorage();
  const { snapshots, onSnapshot } = collect();
  const handle = startLocalStorageSnapshots({ storage, onSnapshot });
  snapshots.length = 0;

  storage.setItem("external", "value");
  window.dispatchEvent(new StorageEvent("storage", { key: "external", storageArea: storage }));
  vi.advanceTimersByTime(250);

  expect(snapshots.filter((s) => s.reason === "change")).toHaveLength(1);

  handle.stop();
});
