import { afterEach, expect, test } from "vite-plus/test";
import { buildRedactedHeaderSet } from "../src/tracks/network/redact.js";
import { patchFetch } from "../src/tracks/network/patchFetch.js";
import type { BuiltNetworkEvent } from "../src/tracks/network/buildRecord.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function collector(): { events: BuiltNetworkEvent[]; onEvent: (event: BuiltNetworkEvent) => void } {
  const events: BuiltNetworkEvent[] = [];
  return { events, onEvent: (event) => events.push(event) };
}

test("redacts the authorization header in the event while the real request still carries it", async () => {
  let seenHeaders: Record<string, string> | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenHeaders = init?.headers as Record<string, string>;
    return new Response('{"ok":true}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const { events, onEvent } = collector();
  const patch = patchFetch({ onEvent, redacted: buildRedactedHeaderSet() });

  await globalThis.fetch("https://api.example.com/data", {
    headers: { Authorization: "Bearer real-secret-token" },
  });

  expect(seenHeaders?.["Authorization"]).toBe("Bearer real-secret-token");
  await flushMicrotasks();
  expect(events).toHaveLength(1);
  expect(events[0]!.data.requestHeaders).toEqual({ Authorization: "[redacted]" });
  expect(events[0]!.data.state).toBe("finished");
  expect(events[0]!.data.status).toBe(200);
  expect(events[0]!.data.resourceType).toBe("Fetch");

  patch.restore();
});

test("a 1 MiB JSON response body is not recorded and responseBodyError says why", async () => {
  const oneMib = "b".repeat(1024 * 1024);
  globalThis.fetch = (async () =>
    new Response(oneMib, {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const { events, onEvent } = collector();
  const patch = patchFetch({ onEvent, redacted: buildRedactedHeaderSet() });

  await globalThis.fetch("https://api.example.com/big");
  await flushMicrotasks();

  expect(events).toHaveLength(1);
  expect(events[0]!.data.responseBody).toBeNull();
  expect(events[0]!.data.responseBodyError).toMatch(/^skipped:/);

  patch.restore();
});

test("a rejected fetch is recorded as failed with a null status", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;

  const { events, onEvent } = collector();
  const patch = patchFetch({ onEvent, redacted: buildRedactedHeaderSet() });

  await expect(globalThis.fetch("https://api.example.com/down")).rejects.toThrow("Failed to fetch");
  await flushMicrotasks();

  expect(events).toHaveLength(1);
  expect(events[0]!.data.state).toBe("failed");
  expect(events[0]!.data.status).toBeNull();

  patch.restore();
});

test("restore puts window.fetch back to the exact function it wrapped", () => {
  const stub = (async () => new Response("")) as typeof fetch;
  globalThis.fetch = stub;

  const patch = patchFetch({ onEvent: () => {}, redacted: buildRedactedHeaderSet() });
  expect(globalThis.fetch).not.toBe(stub);

  patch.restore();
  expect(globalThis.fetch).toBe(stub);
});

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
