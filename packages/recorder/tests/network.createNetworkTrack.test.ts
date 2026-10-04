import { afterEach, expect, test } from "vite-plus/test";
import type { NetworkCapuData } from "../src/capu/types.js";
import type { TrackContext } from "../src/recorder/types.js";
import { createNetworkTrack } from "../src/tracks/network/createNetworkTrack.js";

const originalFetch = globalThis.fetch;
const originalXhr = globalThis.XMLHttpRequest;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.XMLHttpRequest = originalXhr;
});

function fakeContext(): TrackContext<NetworkCapuData> & { entries: NetworkCapuData[] } {
  const entries: NetworkCapuData[] = [];
  return {
    entries,
    push: (data) => entries.push(data),
    startedAt: 0,
    logger: { info: () => {}, warn: () => {} },
  };
}

test("stop restores window.fetch and the XHR prototype methods to their pre-start identity", async () => {
  const stubFetch = (async () => new Response("")) as typeof fetch;
  globalThis.fetch = stubFetch;
  const originalOpen = globalThis.XMLHttpRequest.prototype.open;

  const track = createNetworkTrack();
  const ctx = fakeContext();
  await track.start(ctx);

  expect(globalThis.fetch).not.toBe(stubFetch);
  expect(globalThis.XMLHttpRequest.prototype.open).not.toBe(originalOpen);

  await track.stop();

  expect(globalThis.fetch).toBe(stubFetch);
  expect(globalThis.XMLHttpRequest.prototype.open).toBe(originalOpen);
});

test("ignoreUrl lets a matched fetch through without recording it", async () => {
  globalThis.fetch = (async () =>
    new Response("{}", { headers: { "content-type": "application/json" } })) as typeof fetch;

  const track = createNetworkTrack({ ignoreUrl: (url) => url.includes("/telemetry") });
  const ctx = fakeContext();
  await track.start(ctx);

  await globalThis.fetch("https://api.example.com/telemetry/upload");
  await Promise.resolve();
  await Promise.resolve();

  expect(ctx.entries).toHaveLength(0);

  await track.stop();
});
