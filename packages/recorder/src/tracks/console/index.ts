export { createConsoleTrack } from "./createConsoleTrack.js";
export type { ConsoleTrack, ConsoleTrackOptions } from "./createConsoleTrack.js";
export { createRecorderLogger } from "./createRecorderLogger.js";
export type { RecorderTrackLogger } from "./createRecorderLogger.js";
export { patchConsole, PATCHED_CONSOLE_METHODS } from "./patchConsole.js";
export type { ConsolePatch, PatchConsoleOptions, PatchedConsoleMethod } from "./patchConsole.js";
export { captureErrors } from "./captureErrors.js";
export type { CaptureErrorsOptions, ErrorCapture } from "./captureErrors.js";
export {
  serializeArg,
  truncateText,
  argToText,
  MAX_ARG_DEPTH,
  MAX_ARG_PROPERTIES,
  MAX_ARG_TEXT,
} from "./serializeArg.js";
export { buildEntry, createIdFactory, CONSOLE_LEVELS } from "./entry.js";
export type { ConsoleLevel, EntryExtras } from "./entry.js";
