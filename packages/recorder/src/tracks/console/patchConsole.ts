import type { ConsoleCapuData } from "../../capu/types.js";
import { buildEntry, CONSOLE_LEVELS, createIdFactory, type ConsoleLevel } from "./entry.js";

export type PatchedConsoleMethod = ConsoleLevel | "group" | "groupCollapsed" | "groupEnd";

export const PATCHED_CONSOLE_METHODS: readonly PatchedConsoleMethod[] = [
  ...CONSOLE_LEVELS,
  "group",
  "groupCollapsed",
  "groupEnd",
];

type ConsoleMethod = (...args: unknown[]) => void;

export interface PatchConsoleOptions {
  /** Receives one row per call. Exceptions thrown here are swallowed so the app's own output never breaks. */
  onEntry: (entry: ConsoleCapuData) => void;
  /** Defaults to `globalThis.console`. */
  target?: Console;
  /** Defaults to a per-patch sequential factory. */
  nextId?: () => string;
}

export interface ConsolePatch {
  /** Puts the original methods back exactly as they were, and clears the open-group stack. */
  restore: () => void;
  /** Calls the original, unpatched method so echoed output is not recorded a second time. */
  writeThrough: (method: PatchedConsoleMethod, args: readonly unknown[]) => void;
}

/**
 * Wraps `log info warn error debug group groupCollapsed groupEnd` on `target`. Every wrapper calls
 * the original first and records afterwards; `group*` maintains a stack so rows carry `id` and
 * `parentId` the way Capubridge's console lane nests them.
 */
export function patchConsole(options: PatchConsoleOptions): ConsolePatch {
  const target = options.target ?? globalThis.console;
  const nextId = options.nextId ?? createIdFactory();
  const originals = new Map<PatchedConsoleMethod, ConsoleMethod>();
  const groupStack: string[] = [];
  let recording = false;

  function emit(build: () => ConsoleCapuData): void {
    if (recording) return;
    recording = true;
    try {
      options.onEntry(build());
    } catch {
      return;
    } finally {
      recording = false;
    }
  }

  function parentId(): string | null {
    return groupStack.length > 0 ? groupStack[groupStack.length - 1] : null;
  }

  function wrapLevel(level: ConsoleLevel, original: ConsoleMethod): ConsoleMethod {
    return function patched(this: unknown, ...args: unknown[]) {
      original.apply(this ?? target, args);
      emit(() => buildEntry(level, args, { id: nextId(), parentId: parentId() }));
    };
  }

  function wrapGroup(collapsed: boolean, original: ConsoleMethod): ConsoleMethod {
    return function patched(this: unknown, ...args: unknown[]) {
      original.apply(this ?? target, args);
      const id = nextId();
      emit(() =>
        buildEntry("log", args, {
          id,
          parentId: parentId(),
          isGroup: true,
          groupCollapsed: collapsed,
        }),
      );
      groupStack.push(id);
    };
  }

  function wrapGroupEnd(original: ConsoleMethod): ConsoleMethod {
    return function patched(this: unknown, ...args: unknown[]) {
      original.apply(this ?? target, args);
      groupStack.pop();
    };
  }

  for (const method of PATCHED_CONSOLE_METHODS) {
    const original = target[method] as ConsoleMethod | undefined;
    if (typeof original !== "function") continue;
    originals.set(method, original);
    if (method === "groupEnd") target[method] = wrapGroupEnd(original);
    else if (method === "group") target[method] = wrapGroup(false, original);
    else if (method === "groupCollapsed") target[method] = wrapGroup(true, original);
    else target[method] = wrapLevel(method, original);
  }

  return {
    restore() {
      for (const [method, original] of originals) target[method] = original;
      originals.clear();
      groupStack.length = 0;
    },
    writeThrough(method, args) {
      const original = originals.get(method) ?? (target[method] as ConsoleMethod | undefined);
      if (typeof original === "function") Reflect.apply(original, target, args);
    },
  };
}
