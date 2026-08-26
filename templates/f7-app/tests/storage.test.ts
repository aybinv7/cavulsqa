import { afterEach, expect, test } from "vite-plus/test";
import { describeOpenFailure, probeOpfs, storageLabel } from "../src/shared/database/storage.js";

const original = globalThis.navigator;

afterEach(() => {
  if (original)
    Object.defineProperty(globalThis, "navigator", { value: original, configurable: true });
});

function withNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

/**
 * The regression this exists for: the probe used to require `createSyncAccessHandle` on
 * `FileSystemFileHandle.prototype`. That method is Worker-only in Chromium, so it is absent on the
 * main thread of every device - and the check rejected a phone on WebView 150 that had been running
 * OPFS for hours. A main-thread probe may only look at what the main thread can see.
 */
test("a WebView that supports OPFS passes even without the worker-only method", () => {
  withNavigator({ storage: { getDirectory: () => Promise.resolve({}) } });
  expect("createSyncAccessHandle" in (globalThis.FileSystemFileHandle?.prototype ?? {})).toBe(
    false,
  );
  expect(probeOpfs().supported).toBe(true);
});

test("a WebView with no OPFS at all is refused, and told what to do", () => {
  withNavigator({ storage: {} });
  const probe = probeOpfs();
  expect(probe.supported).toBe(false);
  expect(probe.reason).toMatch(/Android System WebView/);
});

test("an open failure is translated into something actionable", () => {
  const sah = describeOpenFailure(new Error("createSyncAccessHandle is not a function"));
  expect(sah).toMatch(/Android System WebView/);
  // The other cause of the same failure, and the one a person can actually fix themselves.
  expect(sah).toMatch(/still holds the database open/);
  // The engine's own words are kept, so a bug report has something to go on.
  expect(sah).toContain("createSyncAccessHandle is not a function");

  expect(describeOpenFailure(new Error("disk I/O error"))).toBe(
    "The database could not be opened: disk I/O error",
  );
});

test("the storage tier has a label", () => {
  expect(storageLabel("opfs")).toContain("OPFS");
});
