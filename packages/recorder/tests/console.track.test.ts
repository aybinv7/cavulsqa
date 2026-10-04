import { expect, test } from "vite-plus/test";
import type { ConsoleCapuData } from "../src/capu/types.js";
import type { TrackContext } from "../src/recorder/types.js";
import { createConsoleTrack } from "../src/tracks/console/createConsoleTrack.js";
import { createRecorderLogger } from "../src/tracks/console/createRecorderLogger.js";

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

function fakeContext(): TrackContext<ConsoleCapuData> & { entries: ConsoleCapuData[] } {
  const entries: ConsoleCapuData[] = [];
  return {
    entries,
    push: (data) => entries.push(data),
    startedAt: 0,
    logger: { info: () => {}, warn: () => {} },
  };
}

test("start records console calls and stop restores the original method identity", async () => {
  const target = fakeConsole();
  const originalLog = target.log;
  const ctx = fakeContext();

  const track = createConsoleTrack({ consoleTarget: target });
  await track.start(ctx);

  target.log("hello");
  expect(ctx.entries).toHaveLength(1);
  expect(ctx.entries[0]!.text).toBe("hello");

  await track.stop();
  expect(target.log).toBe(originalLog);

  target.log("after stop");
  expect(ctx.entries).toHaveLength(1);
});

test("captured window errors flow into the same track context", async () => {
  const target = fakeConsole();
  const errorTarget = new EventTarget();
  const ctx = fakeContext();

  const track = createConsoleTrack({ consoleTarget: target, errorTarget });
  await track.start(ctx);

  const event = new Event("error") as Event & { message?: string };
  event.message = "boom";
  errorTarget.dispatchEvent(event);

  expect(ctx.entries).toHaveLength(1);
  expect(ctx.entries[0]!.level).toBe("error");

  await track.stop();
});

test("createRecorderLogger adapts a console track to an info/warn logger", async () => {
  const target = fakeConsole();
  const written: unknown[][] = [];
  target.info = (...args: unknown[]) => written.push(["info", ...args]);
  target.warn = (...args: unknown[]) => written.push(["warn", ...args]);
  const ctx = fakeContext();

  const track = createConsoleTrack({ consoleTarget: target });
  await track.start(ctx);
  const logger = createRecorderLogger(track);

  logger.info("db opened", { name: "app.db" });
  logger.warn("slow query", 42);

  expect(written).toEqual([
    ["info", "db opened", { name: "app.db" }],
    ["warn", "slow query", 42],
  ]);
  expect(ctx.entries[0]!.level).toBe("info");
  expect(ctx.entries[0]!.text.startsWith("db opened")).toBe(true);
  expect(ctx.entries[1]!.level).toBe("warn");
  expect(ctx.entries[1]!.text).toBe("slow query 42");

  await track.stop();
});

test("logMessage never throws when the track has not been started", () => {
  const target = fakeConsole();
  const track = createConsoleTrack({ consoleTarget: target });
  const logger = createRecorderLogger(track);

  expect(() => logger.info("no context yet")).not.toThrow();
});
