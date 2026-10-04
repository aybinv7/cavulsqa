import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "vite-plus/test";
import { buildArchive } from "../src/capu/archive.js";
import { assertManifest } from "../src/capu/manifest.js";
import type { CapuEvent, SessionManifest } from "../src/capu/types.js";

function manifest(overrides: Partial<SessionManifest> = {}): SessionManifest {
  return {
    version: 1,
    sessionId: "capu_1000_abc123",
    label: "demo",
    startedAt: 1000,
    duration: 0,
    deviceSerial: null,
    targetUrl: null,
    appPackage: null,
    tracks: { rrweb: true, network: true, console: true },
    ...overrides,
  };
}

function ndjson(events: Array<{ t: number; data: unknown }>): string {
  return events.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

async function* segments(...chunks: string[]): AsyncIterable<string> {
  for (const chunk of chunks) yield chunk;
}

function requireEntry(unzipped: Record<string, Uint8Array>, path: string): Uint8Array {
  const entry = unzipped[path];
  if (!entry) throw new Error(`missing zip entry: ${path}`);
  return entry;
}

test("trims rrweb to the first Meta+FullSnapshot pair and rebases t to 0", async () => {
  const rrweb = ndjson([
    { t: 100, data: { type: 3 } },
    { t: 200, data: { type: 4 } },
    { t: 300, data: { type: 2 } },
    { t: 400, data: { type: 3 } },
  ]);
  const { manifest: built } = await buildArchive({
    manifest: manifest(),
    tracks: { rrweb: segments(rrweb) },
    now: 1000 + 500,
  });

  expect(built.startedAt).toBe(1000 + 200);
  expect(built.duration).toBe(300);
});

test("rebases every track's t against the rrweb trim point and drops earlier events", async () => {
  const rrweb = ndjson([
    { t: 200, data: { type: 4 } },
    { t: 300, data: { type: 2 } },
  ]);
  const console_ = ndjson([
    { t: 100, data: "before trim" },
    { t: 250, data: "during meta" },
    { t: 350, data: "after full snapshot" },
  ]);

  const { manifest: built, archive } = await buildArchive({
    manifest: manifest(),
    tracks: { rrweb: segments(rrweb), console: segments(console_) },
    now: 1000 + 400,
  });

  const unzipped = unzipSync(archive);
  const consoleLines = strFromU8(requireEntry(unzipped, "tracks/console.ndjson"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as CapuEvent);

  expect(consoleLines).toHaveLength(2);
  expect(consoleLines[0]).toEqual({ t: 50, data: "during meta" });
  expect(consoleLines[1]).toEqual({ t: 150, data: "after full snapshot" });
  expect(built.startedAt).toBe(1000 + 200);
});

test("a built archive unzips to a manifest that passes assertManifest and NDJSON lines with t >= 0 monotonic per track", async () => {
  const rrweb = ndjson([
    { t: 0, data: { type: 4 } },
    { t: 10, data: { type: 2 } },
    { t: 20, data: { type: 3 } },
  ]);
  const network = ndjson([
    { t: 5, data: { url: "a" } },
    { t: 15, data: { url: "b" } },
  ]);

  const { archive } = await buildArchive({
    manifest: manifest(),
    tracks: { rrweb: segments(rrweb), network: segments(network) },
    now: 1000 + 30,
    producer: { recorderVersion: "0.1.0" },
  });

  const unzipped = unzipSync(archive);
  expect(Object.keys(unzipped)).toEqual(
    expect.arrayContaining([
      "manifest.json",
      "tracks/rrweb.ndjson",
      "tracks/network.ndjson",
      "capu/producer.json",
    ]),
  );

  const parsedManifest: unknown = JSON.parse(strFromU8(requireEntry(unzipped, "manifest.json")));
  expect(() => assertManifest(parsedManifest, "capu_1000_abc123")).not.toThrow();

  for (const path of ["tracks/rrweb.ndjson", "tracks/network.ndjson"]) {
    const lines = strFromU8(requireEntry(unzipped, path))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as CapuEvent);
    let previousT = -1;
    for (const event of lines) {
      expect(event.t).toBeGreaterThanOrEqual(0);
      expect(event.t).toBeGreaterThanOrEqual(previousT);
      expect(event).toHaveProperty("data");
      previousT = event.t;
    }
  }
});

test("a track with no full snapshot pair keeps all events and rebases from the first one", async () => {
  const rrweb = ndjson([
    { t: 500, data: { type: 3 } },
    { t: 600, data: { type: 3 } },
  ]);
  const { manifest: built } = await buildArchive({
    manifest: manifest(),
    tracks: { rrweb: segments(rrweb) },
    now: 1000 + 700,
  });
  expect(built.startedAt).toBe(1000 + 500);
});

test("a truncated trailing line is skipped and reported instead of failing the archive", async () => {
  const rrweb =
    ndjson([
      { t: 0, data: { type: 4 } },
      { t: 1, data: { type: 2 } },
    ]) + '{"t":2,"data":{"typ';
  const { archive, manifest: built } = await buildArchive({
    manifest: manifest(),
    tracks: { rrweb: segments(rrweb) },
    now: 1000 + 50,
  });

  const unzipped = unzipSync(archive);
  const lines = strFromU8(requireEntry(unzipped, "tracks/rrweb.ndjson")).trim().split("\n");
  expect(lines).toHaveLength(2);
  expect(built.incomplete?.errors).toEqual(["rrweb: skipped 1 unreadable line(s)"]);
  assertManifest(built, built.sessionId);
});
