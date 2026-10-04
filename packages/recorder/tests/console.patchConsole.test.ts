import { expect, test } from "vite-plus/test";
import type { ConsoleCapuData } from "../src/capu/types.js";
import { patchConsole } from "../src/tracks/console/patchConsole.js";

function fakeConsole(): Console {
  return {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    group: () => {},
    groupCollapsed: () => {},
    groupEnd: () => {},
  } as unknown as Console;
}

test("wraps every level and always calls the original", () => {
  const target = fakeConsole();
  const originalLog = target.log;
  const calls: unknown[][] = [];
  target.log = (...args: unknown[]) => calls.push(args);
  const originalPatchedLog = target.log;

  const entries: ConsoleCapuData[] = [];
  const patch = patchConsole({ onEntry: (e) => entries.push(e), target });

  target.log("hello", 42);
  expect(calls).toEqual([["hello", 42]]);
  expect(entries).toHaveLength(1);
  expect(entries[0]!.level).toBe("log");
  expect(entries[0]!.text).toBe("hello 42");

  patch.restore();
  expect(target.log).toBe(originalPatchedLog);
  void originalLog;
});

test("group and groupCollapsed push an id and nested calls carry parentId", () => {
  const target = fakeConsole();
  const entries: ConsoleCapuData[] = [];
  let counter = 0;
  const patch = patchConsole({
    onEntry: (e) => entries.push(e),
    target,
    nextId: () => `id-${++counter}`,
  });

  target.group("outer");
  target.log("inside outer");
  target.groupCollapsed("inner");
  target.log("inside inner");
  target.groupEnd();
  target.log("back in outer");
  target.groupEnd();
  target.log("top level");

  expect(
    entries.map((e) => [e.text, e.id, e.parentId, e.isGroup ?? false, e.groupCollapsed ?? false]),
  ).toEqual([
    ["outer", "id-1", null, true, false],
    ["inside outer", "id-2", "id-1", false, false],
    ["inner", "id-3", "id-1", true, true],
    ["inside inner", "id-4", "id-3", false, false],
    ["back in outer", "id-5", "id-1", false, false],
    ["top level", "id-6", null, false, false],
  ]);

  patch.restore();
});

test("restore puts every original method back so identity checks pass", () => {
  const target = fakeConsole();
  const originals = {
    log: target.log,
    info: target.info,
    warn: target.warn,
    error: target.error,
    debug: target.debug,
    group: target.group,
    groupCollapsed: target.groupCollapsed,
    groupEnd: target.groupEnd,
  };

  const patch = patchConsole({ onEntry: () => {}, target });
  expect(target.log).not.toBe(originals.log);

  patch.restore();
  expect(target.log).toBe(originals.log);
  expect(target.info).toBe(originals.info);
  expect(target.warn).toBe(originals.warn);
  expect(target.error).toBe(originals.error);
  expect(target.debug).toBe(originals.debug);
  expect(target.group).toBe(originals.group);
  expect(target.groupCollapsed).toBe(originals.groupCollapsed);
  expect(target.groupEnd).toBe(originals.groupEnd);
});

test("onEntry throwing never breaks the original call", () => {
  const target = fakeConsole();
  const calls: unknown[][] = [];
  target.warn = (...args: unknown[]) => calls.push(args);

  const patch = patchConsole({
    onEntry: () => {
      throw new Error("recording failed");
    },
    target,
  });

  expect(() => target.warn("still logs")).not.toThrow();
  expect(calls).toEqual([["still logs"]]);

  patch.restore();
});
