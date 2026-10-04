import type { ConsoleTrack } from "./createConsoleTrack.js";

/** The `(message, ...details) => void` shape shared by `MobileDbLogger` and any future package logger. */
export interface RecorderTrackLogger {
  info(message: string, ...details: unknown[]): void;
  warn(message: string, ...details: unknown[]): void;
}

/**
 * Adapts a `ConsoleTrack` to `RecorderTrackLogger` so a package's own `info`/`warn` calls (for
 * example `@cavulsqa/mobile-db`'s `MobileDbLogger`) are recorded into the console track and still
 * printed to the real console, without patching a second copy of `console.*`.
 */
export function createRecorderLogger(track: ConsoleTrack): RecorderTrackLogger {
  return {
    info: (message, ...details) => track.logMessage("info", [message, ...details]),
    warn: (message, ...details) => track.logMessage("warn", [message, ...details]),
  };
}
