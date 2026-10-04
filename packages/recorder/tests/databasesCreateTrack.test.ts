import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import type { DatabaseCapuData } from "../src/capu/types.js";
import type { TrackContext } from "../src/recorder/types.js";
import { createDatabasesTrack } from "../src/tracks/databases/createDatabasesTrack.js";
import type { TableChangeBusEvent } from "../src/tracks/databases/tableChanges.js";
import { silentLogger } from "../src/recorder/logger.js";

/** See `databasesLocalStorage.test.ts`: happy-dom's `window.localStorage` cannot be monkey-patched. */
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
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

function fakeContext(): { ctx: TrackContext<DatabaseCapuData>; pushed: DatabaseCapuData[] } {
  const pushed: DatabaseCapuData[] = [];
  return {
    pushed,
    ctx: {
      push: (data) => pushed.push(data),
      startedAt: 0,
      logger: silentLogger,
    },
  };
}

function fakeBus() {
  let listener: ((event: TableChangeBusEvent) => void) | undefined;
  return {
    on: (_tables: readonly string[], fn: (event: TableChangeBusEvent) => void) => {
      listener = fn;
      return () => {
        listener = undefined;
      };
    },
    emit(event: TableChangeBusEvent) {
      listener?.(event);
    },
  };
}

test("records localStorage by default and no tableChange without a bus", async () => {
  window.localStorage.setItem("theme", "dark");
  const track = createDatabasesTrack();
  const { ctx, pushed } = fakeContext();

  expect(track.name).toBe("databases");
  await track.start(ctx);

  expect(pushed).toHaveLength(1);
  expect(pushed[0]).toMatchObject({ kind: "localStorage", reason: "initial" });

  await track.stop();
  expect(pushed.at(-1)).toMatchObject({ kind: "localStorage", reason: "final" });
});

test("localStorage: false disables the localStorage snapshots", async () => {
  window.localStorage.setItem("theme", "dark");
  const track = createDatabasesTrack({ localStorage: false });
  const { ctx, pushed } = fakeContext();

  await track.start(ctx);
  await track.stop();

  expect(pushed).toHaveLength(0);
});

test("a changeBus produces tableChange events alongside localStorage snapshots", async () => {
  const bus = fakeBus();
  const track = createDatabasesTrack({ changeBus: bus });
  const { ctx, pushed } = fakeContext();

  await track.start(ctx);
  bus.emit({ table: "orders", type: "bulk", affectedRows: 3 });

  const tableChange = pushed.find((event) => event.kind === "tableChange");
  expect(tableChange).toEqual({
    kind: "tableChange",
    engine: "sqlite",
    table: "orders",
    type: "bulk",
    affectedRows: 3,
    affectedIds: null,
    transactionId: null,
  });

  await track.stop();
});

test("stop() unsubscribes the bus so later emits are not recorded", async () => {
  const bus = fakeBus();
  const track = createDatabasesTrack({ changeBus: bus, localStorage: false });
  const { ctx, pushed } = fakeContext();

  await track.start(ctx);
  await track.stop();
  bus.emit({ table: "orders", type: "insert" });

  expect(pushed).toHaveLength(0);
});

test("masks authToken by default via a plain setItem", async () => {
  const storage = fakeStorage();
  const track = createDatabasesTrack({ storage });
  const { ctx, pushed } = fakeContext();

  await track.start(ctx);
  storage.setItem("authToken", "secret-value");
  await vi.advanceTimersByTimeAsync(250);

  const change = pushed.find((event) => event.kind === "localStorage" && event.reason === "change");
  expect(change).toBeDefined();
  if (change?.kind === "localStorage") {
    expect(change.entries.find((e) => e.key === "authToken")?.value).toBe("[masked]");
  }

  await track.stop();
});
