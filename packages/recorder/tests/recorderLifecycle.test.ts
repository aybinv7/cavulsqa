import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "vite-plus/test";
import { assertManifest } from "../src/capu/manifest.js";
import type { SessionManifest } from "../src/capu/types.js";
import { createRecorder } from "../src/recorder/createRecorder.js";
import { silentLogger } from "../src/recorder/logger.js";
import type { RecorderSink, TrackRecorder } from "../src/recorder/types.js";

function fakeTrack(
  name: TrackRecorder["name"],
  behavior: { failStart?: boolean } = {},
): TrackRecorder {
  return {
    name,
    async start(ctx) {
      if (behavior.failStart) throw new Error("intentional start failure");
      ctx.push({ hello: name });
    },
    async stop() {},
  };
}

function recordingSink(): RecorderSink & {
  calls: Array<{ archive: Uint8Array; manifest: SessionManifest }>;
} {
  const calls: Array<{ archive: Uint8Array; manifest: SessionManifest }> = [];
  return {
    calls,
    async save(archive, manifest) {
      calls.push({ archive, manifest });
    },
  };
}

test("a recorder with one failing track still captures the working tracks", async () => {
  const working = fakeTrack("console");
  const failing = fakeTrack("network", { failStart: true });
  const sink = recordingSink();

  const recorder = createRecorder({
    tracks: [working, failing],
    sink,
    label: "session",
    appId: "dz.sig.demo",
    appVersion: "1.0.0",
    logger: silentLogger,
  });

  await recorder.start();
  expect(recorder.status.recording).toBe(true);

  await recorder.capture("manual");

  expect(sink.calls).toHaveLength(1);
  const savedManifest = sink.calls[0]?.manifest;
  expect(savedManifest?.incomplete?.missingTracks).toEqual(["network"]);
  expect(savedManifest?.incomplete?.errors[0]).toMatch(/^network: intentional start failure/);
  expect(savedManifest?.label).toBe("session · manual");

  const archive = sink.calls[0]?.archive;
  if (!archive) throw new Error("archive missing");
  const unzipped = unzipSync(archive);
  const consoleLines = strFromU8(unzipped["tracks/console.ndjson"] ?? new Uint8Array())
    .trim()
    .split("\n")
    .filter(Boolean);
  expect(consoleLines).toHaveLength(1);
  expect(unzipped["tracks/network.ndjson"]).toBeUndefined();

  expect(() =>
    assertManifest(JSON.parse(strFromU8(unzipped["manifest.json"] ?? new Uint8Array()))),
  ).not.toThrow();

  await recorder.stop();
});

test("recorder status stays recording and lastError is set when the sink throws", async () => {
  const working = fakeTrack("console");
  const throwingSink: RecorderSink = {
    async save() {
      throw new Error("disk full");
    },
  };

  const recorder = createRecorder({
    tracks: [working],
    sink: throwingSink,
    label: "session",
    appId: "dz.sig.demo",
    appVersion: "1.0.0",
    logger: silentLogger,
  });

  await recorder.start();
  await expect(recorder.capture("manual")).resolves.toBeUndefined();

  expect(recorder.status.recording).toBe(true);
  expect(recorder.status.lastError).toMatch(/disk full/);

  await recorder.stop();
});

test("capture keeps recording so a later capture still works", async () => {
  const working = fakeTrack("console");
  const sink = recordingSink();

  const recorder = createRecorder({
    tracks: [working],
    sink,
    label: "session",
    appId: "dz.sig.demo",
    appVersion: "1.0.0",
    logger: silentLogger,
  });

  await recorder.start();
  await recorder.capture("first");
  expect(recorder.status.recording).toBe(true);
  await recorder.capture("second");

  expect(sink.calls).toHaveLength(2);
  expect(sink.calls[1]?.manifest.label).toBe("session · second");

  await recorder.stop();
});
