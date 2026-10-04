import type { ConsoleCapuData } from "../../capu/types.js";
import type { TrackContext, TrackRecorder } from "../../recorder/types.js";
import { captureErrors, type ErrorCapture } from "./captureErrors.js";
import { buildEntry, type ConsoleLevel } from "./entry.js";
import { patchConsole, type ConsolePatch, type PatchedConsoleMethod } from "./patchConsole.js";

export interface ConsoleTrackOptions {
  /** Defaults to `globalThis.console`. Overridden in tests. */
  consoleTarget?: Console;
  /** Defaults to `globalThis.window`. Overridden in tests; passed through to `captureErrors`. */
  errorTarget?: EventTarget;
  /** Defaults to a per-patch sequential factory. Overridden in tests for deterministic ids. */
  nextId?: () => string;
}

/**
 * A console track exposes `logMessage` beyond the `TrackRecorder` contract so
 * `createRecorderLogger` can route an injected app logger through the same recorded stream
 * without re-triggering the patched `console` methods a second time.
 */
export interface ConsoleTrack extends TrackRecorder<ConsoleCapuData> {
  /** Records one entry and writes it through to the real console, bypassing the patch. */
  logMessage(level: ConsoleLevel, args: readonly unknown[]): void;
}

/**
 * Console track: wraps `console.*`, listens for uncaught errors and unhandled rejections, and
 * accepts messages from `createRecorderLogger` — all pushed as `ConsoleCapuData` rows in the
 * shape Capubridge's `ReplayConsoleLane.vue` renders. `stop` restores every patched method.
 */
export function createConsoleTrack(options: ConsoleTrackOptions = {}): ConsoleTrack {
  const consoleTarget = options.consoleTarget ?? globalThis.console;

  let context: TrackContext<ConsoleCapuData> | null = null;
  let patch: ConsolePatch | null = null;
  let errors: ErrorCapture | null = null;

  function push(entry: ConsoleCapuData): void {
    context?.push(entry);
  }

  return {
    name: "console",
    async start(ctx) {
      context = ctx;
      patch = patchConsole({
        onEntry: push,
        target: consoleTarget,
        nextId: options.nextId,
      });
      errors = captureErrors({ onEntry: push, target: options.errorTarget });
    },
    async stop() {
      patch?.restore();
      patch = null;
      errors?.stop();
      errors = null;
      context = null;
    },
    logMessage(level, args) {
      patch?.writeThrough(level as PatchedConsoleMethod, args);
      push(buildEntry(level, args));
    },
  };
}
