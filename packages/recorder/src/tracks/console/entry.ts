import type { ConsoleArgRecord, ConsoleCapuData } from "../../capu/types.js";
import { argToText, serializeArg, truncateText } from "./serializeArg.js";

/** The console methods the track records. `group*` levels are recorded as `log` rows with `isGroup`. */
export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export const CONSOLE_LEVELS: readonly ConsoleLevel[] = ["log", "info", "warn", "error", "debug"];

export interface EntryExtras {
  source?: string | null;
  line?: number | null;
  id?: string;
  parentId?: string | null;
  isGroup?: boolean;
  groupCollapsed?: boolean;
}

/** Serializes `args` and builds the `ConsoleCapuData` row; `text` joins each argument's text with a space. */
export function buildEntry(
  level: string,
  args: readonly unknown[],
  extras: EntryExtras = {},
): ConsoleCapuData {
  const records: ConsoleArgRecord[] = args.map(serializeArg);
  return {
    level,
    text: truncateText(records.map(argToText).join(" ")),
    source: extras.source ?? null,
    line: extras.line ?? null,
    ...(extras.id !== undefined ? { id: extras.id } : {}),
    ...(extras.parentId !== undefined ? { parentId: extras.parentId } : {}),
    ...(extras.isGroup ? { isGroup: true } : {}),
    ...(extras.groupCollapsed ? { groupCollapsed: true } : {}),
    ...(records.length > 0 ? { args: records } : {}),
  };
}

/** Sequential ids unique within one recorder instance, prefixed so ids from separate sessions do not collide. */
export function createIdFactory(
  prefix: string = Math.random().toString(36).slice(2, 8),
): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}
