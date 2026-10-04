import { expect, test, vi } from "vite-plus/test";
import { createBatteryReader } from "../src/tracks/perf/battery.js";

function fakeBatteryManager(initial: { level: number; charging: boolean }) {
  const listeners = new Map<string, Set<() => void>>();
  const manager = {
    level: initial.level,
    charging: initial.charging,
    addEventListener: (type: string, listener: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener);
    },
  };
  const emit = (type: string) => {
    for (const listener of listeners.get(type) ?? []) listener();
  };
  return { manager, emit, listenerCount: (type: string) => listeners.get(type)?.size ?? 0 };
}

test("read returns null until getBattery is missing", () => {
  const reader = createBatteryReader({});
  expect(reader.read()).toBeNull();
  reader.dispose();
});

test("read returns null before the getBattery promise resolves, then the resolved reading", async () => {
  const { manager } = fakeBatteryManager({ level: 0.75, charging: false });
  const reader = createBatteryReader({ getBattery: () => Promise.resolve(manager) });
  expect(reader.read()).toBeNull();
  await vi.waitFor(() => expect(reader.read()).not.toBeNull());
  expect(reader.read()).toEqual({ level: 0.75, charging: false });
  reader.dispose();
});

test("read stays null forever when getBattery rejects", async () => {
  const reader = createBatteryReader({ getBattery: () => Promise.reject(new Error("denied")) });
  await vi.waitFor(() => {
    expect(reader.read()).toBeNull();
  });
  expect(reader.read()).toBeNull();
  reader.dispose();
});

test("levelchange and chargingchange events refresh the cached reading", async () => {
  const { manager, emit } = fakeBatteryManager({ level: 0.5, charging: false });
  const reader = createBatteryReader({ getBattery: () => Promise.resolve(manager) });
  await vi.waitFor(() => expect(reader.read()).not.toBeNull());

  manager.level = 0.9;
  emit("levelchange");
  expect(reader.read()).toEqual({ level: 0.9, charging: false });

  manager.charging = true;
  emit("chargingchange");
  expect(reader.read()).toEqual({ level: 0.9, charging: true });

  reader.dispose();
});

test("dispose removes both listeners and clears the cached reading", async () => {
  const { manager, listenerCount } = fakeBatteryManager({ level: 0.5, charging: false });
  const reader = createBatteryReader({ getBattery: () => Promise.resolve(manager) });
  await vi.waitFor(() => expect(reader.read()).not.toBeNull());

  reader.dispose();

  expect(reader.read()).toBeNull();
  expect(listenerCount("levelchange")).toBe(0);
  expect(listenerCount("chargingchange")).toBe(0);
});

test("dispose before the promise resolves prevents the manager from being wired up", async () => {
  const { manager, listenerCount } = fakeBatteryManager({ level: 0.5, charging: false });
  let resolvePromise: (m: typeof manager) => void = () => {};
  const promise = new Promise<typeof manager>((resolve) => {
    resolvePromise = resolve;
  });
  const reader = createBatteryReader({ getBattery: () => promise });

  reader.dispose();
  resolvePromise(manager);
  await promise;
  await Promise.resolve();

  expect(reader.read()).toBeNull();
  expect(listenerCount("levelchange")).toBe(0);
});
