import { afterEach, expect, test, vi } from "vite-plus/test";
import {
  describeOpenFailure,
  openFirstAvailable,
  probeIndexedDb,
  probeOpfsCapable,
  type StorageCandidate,
} from "../src/storage.js";

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
 * main thread of every device - and the check rejected a phone that had been running OPFS for
 * hours. A main-thread probe may only look at what the main thread can see.
 */
test("a WebView that supports OPFS passes even without the worker-only method", () => {
  withNavigator({ storage: { getDirectory: () => Promise.resolve({}) } });
  expect(probeOpfsCapable().supported).toBe(true);
});

test("a WebView with no OPFS is refused, and told what to do", () => {
  withNavigator({ storage: {} });
  const probe = probeOpfsCapable();
  expect(probe.supported).toBe(false);
  if (!probe.supported) expect(probe.reason).toMatch(/Android System WebView/);
});

test("an open failure is translated into something actionable", () => {
  const sah = describeOpenFailure(new Error("createSyncAccessHandle is not a function"));
  expect(sah).toMatch(/Android System WebView/);
  expect(sah).toMatch(/still holds the database open/);
  expect(sah).toContain("createSyncAccessHandle is not a function");
});

function candidate(
  id: string,
  supported: boolean,
  open: () => Promise<string>,
): StorageCandidate<string> {
  return {
    id,
    label: id,
    probe: () => (supported ? { supported: true } : { supported: false, reason: "no" }),
    open,
  };
}

test("the first candidate that opens wins, and the rest are never opened", async () => {
  const second = vi.fn(() => Promise.resolve("second"));
  const choice = await openFirstAvailable([
    candidate("first", true, () => Promise.resolve("first")),
    candidate("second", true, second),
  ]);

  expect(choice.value).toBe("first");
  expect(second).not.toHaveBeenCalled();
});

test("an unsupported candidate is skipped without being opened", async () => {
  const skipped = vi.fn(() => Promise.resolve("nope"));
  const choice = await openFirstAvailable([
    candidate("skipped", false, skipped),
    candidate("used", true, () => Promise.resolve("used")),
  ]);

  expect(skipped).not.toHaveBeenCalled();
  expect(choice.candidate.id).toBe("used");
  expect(choice.attempts[0]).toMatchObject({ id: "skipped", outcome: "unsupported" });
});

test("a candidate is retried once before the chain moves on", async () => {
  const flaky = vi.fn();
  flaky.mockRejectedValueOnce(new Error("directory locked"));
  flaky.mockResolvedValueOnce("recovered");

  const choice = await openFirstAvailable([candidate("flaky", true, flaky)], { retryDelayMs: 1 });

  expect(flaky).toHaveBeenCalledTimes(2);
  expect(choice.value).toBe("recovered");
});

test("a candidate that fails twice hands over to the next", async () => {
  const choice = await openFirstAvailable(
    [
      candidate("broken", true, () => Promise.reject(new Error("disk I/O error"))),
      candidate("fallback", true, () => Promise.resolve("fallback")),
    ],
    { retryDelayMs: 1 },
  );

  expect(choice.candidate.id).toBe("fallback");
  expect(choice.attempts[0]).toMatchObject({ id: "broken", outcome: "failed" });
  expect(choice.attempts[0].detail).toContain("disk I/O error");
});

test("when nothing opens, the error names every attempt", async () => {
  await expect(
    openFirstAvailable(
      [
        candidate("a", false, () => Promise.resolve("")),
        candidate("b", true, () => Promise.reject(new Error("boom"))),
      ],
      { retryDelayMs: 1 },
    ),
  ).rejects.toThrow(/a: unsupported[\s\S]*b: failed[\s\S]*boom/);
});

test("indexedDB is probed separately, because it needs no OPFS", () => {
  expect(probeIndexedDb().supported).toBe(typeof indexedDB !== "undefined");
});
