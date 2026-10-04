import { expect, test } from "vite-plus/test";
import type { ConsoleCapuData } from "../src/capu/types.js";
import { captureErrors } from "../src/tracks/console/captureErrors.js";

class FakeTarget extends EventTarget {}

test("captures window error events as level: error rows with source and line", () => {
  const target = new FakeTarget();
  const entries: ConsoleCapuData[] = [];
  const capture = captureErrors({ onEntry: (e) => entries.push(e), target });

  const error = new Error("boom");
  const event = new Event("error") as Event & {
    message?: string;
    filename?: string;
    lineno?: number;
    error?: unknown;
  };
  event.message = "boom";
  event.filename = "app.js";
  event.lineno = 12;
  event.error = error;
  target.dispatchEvent(event);

  expect(entries).toHaveLength(1);
  expect(entries[0]!.level).toBe("error");
  expect(entries[0]!.source).toBe("app.js");
  expect(entries[0]!.line).toBe(12);
  expect(entries[0]!.text).toContain("boom");

  capture.stop();
});

test("captures unhandledrejection events as level: error rows", () => {
  const target = new FakeTarget();
  const entries: ConsoleCapuData[] = [];
  const capture = captureErrors({ onEntry: (e) => entries.push(e), target });

  const event = new Event("unhandledrejection") as Event & { reason?: unknown };
  event.reason = "rejected value";
  target.dispatchEvent(event);

  expect(entries).toHaveLength(1);
  expect(entries[0]!.level).toBe("error");
  expect(entries[0]!.source).toBeNull();
  expect(entries[0]!.line).toBeNull();
  expect(entries[0]!.text).toContain("rejected value");

  capture.stop();
});

test("stop removes both listeners", () => {
  const target = new FakeTarget();
  const entries: ConsoleCapuData[] = [];
  const capture = captureErrors({ onEntry: (e) => entries.push(e), target });
  capture.stop();

  target.dispatchEvent(new Event("error"));
  target.dispatchEvent(new Event("unhandledrejection"));

  expect(entries).toHaveLength(0);
});
