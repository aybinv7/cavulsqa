import type { BatteryReading } from "./sample.js";

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface NavigatorWithBattery {
  getBattery?: () => Promise<BatteryManagerLike>;
}

export interface BatteryReader {
  read: () => BatteryReading | null;
  dispose: () => void;
}

const BATTERY_EVENTS = ["levelchange", "chargingchange"] as const;

/**
 * Wraps `navigator.getBattery()` in a synchronous reader. The manager is requested once, its
 * `levelchange` and `chargingchange` events keep the cached reading fresh, and `dispose` removes
 * the listeners. `read` returns `null` until the manager resolves, or forever when the API is
 * missing or rejects. `level` is the raw 0..1 fraction; the sample converts it to a percent.
 */
export function createBatteryReader(nav: unknown = globalThis.navigator): BatteryReader {
  let manager: BatteryManagerLike | null = null;
  let reading: BatteryReading | null = null;
  let disposed = false;

  const refresh = () => {
    if (!manager) return;
    reading = { level: manager.level, charging: manager.charging };
  };

  const getBattery = (nav as NavigatorWithBattery | undefined)?.getBattery;
  if (typeof getBattery === "function") {
    Promise.resolve()
      .then(() => getBattery.call(nav))
      .then((resolved) => {
        if (disposed || !resolved) return;
        manager = resolved;
        for (const type of BATTERY_EVENTS) manager.addEventListener(type, refresh);
        refresh();
      })
      .catch(() => {
        reading = null;
      });
  }

  return {
    read: () => reading,
    dispose: () => {
      disposed = true;
      if (manager) {
        for (const type of BATTERY_EVENTS) manager.removeEventListener(type, refresh);
        manager = null;
      }
      reading = null;
    },
  };
}
