import { Capacitor } from "@capacitor/core";

/**
 * Which SQLite implementation backs the app.
 *
 * `capacitor` is the default on a device: a real file, through the plugin, over the native bridge.
 * `opfs` is SQLite compiled to WebAssembly against an OPFS file in a worker - also durable, also
 * page-by-page, but with no bridge in the path. `sqljs` is memory-only and exists so a browser has
 * something to run.
 *
 * It is a runtime choice rather than a build flag for one reason: the only way to know whether the
 * bridge is worth its cost is to measure both on the same device, in the same build, minutes apart.
 */
export type DatabaseEngine = "capacitor" | "opfs" | "sqljs";

const STORAGE_KEY = "app.database.engine";

export function defaultEngine(): DatabaseEngine {
  return Capacitor.isNativePlatform() ? "capacitor" : "sqljs";
}

/**
 * Read from localStorage rather than the database, for the obvious reason: this decides which
 * database to open.
 */
export function selectedEngine(): DatabaseEngine {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "capacitor" || stored === "opfs" || stored === "sqljs") return stored;
  } catch {
    // Private mode, or storage disabled. The default is always available.
  }
  return defaultEngine();
}

/** Takes effect on the next launch: swapping engines under a live Kysely instance is not a thing. */
export function selectEngine(engine: DatabaseEngine): void {
  try {
    localStorage.setItem(STORAGE_KEY, engine);
  } catch {
    // Nothing to do - the app keeps running on the current engine.
  }
}

export function engineLabel(engine: DatabaseEngine): string {
  return {
    capacitor: "Capacitor SQLite (native bridge)",
    opfs: "SQLite WASM over OPFS (worker)",
    sqljs: "sql.js (in memory)",
  }[engine];
}

/** Which engines this platform can actually open, in the order a picker should show them. */
export function availableEngines(): DatabaseEngine[] {
  return Capacitor.isNativePlatform() ? ["capacitor", "opfs"] : ["opfs", "sqljs"];
}
