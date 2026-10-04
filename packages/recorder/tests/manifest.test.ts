import { expect, test } from "vite-plus/test";
import { assertManifest, createManifest, ManifestError } from "../src/capu/manifest.js";
import type { SessionManifest } from "../src/capu/types.js";

const tracks = { rrweb: true, network: true, console: true } as const;

function minimal(): SessionManifest {
  return {
    version: 1,
    sessionId: "capu_1_abc123",
    label: "test",
    startedAt: 1_757_800_000_000,
    duration: 0,
    deviceSerial: null,
    targetUrl: null,
    appPackage: null,
    tracks: { ...tracks },
  };
}

test("createManifest produces a version 1 manifest that passes assertManifest", () => {
  const manifest = createManifest({ label: "demo", tracks, startedAt: 42 });
  expect(manifest.version).toBe(1);
  expect(manifest.deviceSerial).toBeNull();
  expect(manifest.duration).toBe(0);
  expect(manifest.startedAt).toBe(42);
  expect(manifest.targetUrl).toBeNull();
  expect(manifest.appPackage).toBeNull();
  expect(manifest.sessionId).toMatch(/^capu_42_[0-9a-z]{6}$/);
  expect(() => assertManifest(manifest)).not.toThrow();
});

test("createManifest copies the optional additive fields", () => {
  const manifest = createManifest({
    label: "demo",
    tracks,
    sessionId: "capu_1_abc123",
    producer: { name: "@cavulsqa/recorder", version: "0.1.0", platform: "android" },
    device: {
      model: "Pixel",
      osVersion: "14",
      webviewVersion: "124",
      appId: "dz.sig.demo",
      appVersion: "1.0.0",
    },
    databaseTracks: { localStorage: true, sqlite: true },
    incomplete: { errors: ["x"], missingTracks: ["perf"] },
  });
  expect(manifest.sessionId).toBe("capu_1_abc123");
  expect(manifest.producer?.platform).toBe("android");
  expect(manifest.device?.appId).toBe("dz.sig.demo");
  expect(manifest.databaseTracks).toEqual({ localStorage: true, sqlite: true });
  expect(manifest.incomplete).toEqual({ errors: ["x"], missingTracks: ["perf"] });
  expect(() => assertManifest(manifest)).not.toThrow();
});

test("assertManifest accepts a minimal valid manifest and extra keys", () => {
  expect(() => assertManifest(minimal())).not.toThrow();
  expect(() => assertManifest({ ...minimal(), producer: { name: "x" }, extra: 1 })).not.toThrow();
});

test("assertManifest checks the expected session id when given", () => {
  expect(() => assertManifest(minimal(), "capu_1_abc123")).not.toThrow();
  expect(() => assertManifest(minimal(), "capu_2_abc123")).toThrow(/does not match/);
});

test.each(["version", "sessionId", "label", "startedAt", "duration", "tracks"] as const)(
  "assertManifest rejects a manifest missing %s",
  (key) => {
    const broken: Record<string, unknown> = { ...minimal() };
    delete broken[key];
    expect(() => assertManifest(broken)).toThrow(ManifestError);
    expect(() => assertManifest(broken)).toThrow(new RegExp(key));
  },
);

test.each([
  ["version 2", { version: 2 }, /version must be 1/],
  ["a non-object", "manifest", /expected an object/],
  ["an array", [], /expected an object/],
  ["a sessionId with a slash", { sessionId: "a/b" }, /sessionId/],
  ["a sessionId with a leading dot", { sessionId: ".hidden" }, /sessionId/],
  ["an empty sessionId", { sessionId: "   " }, /sessionId/],
  ["a numeric label", { label: 1 }, /label/],
  ["a negative startedAt", { startedAt: -1 }, /startedAt/],
  ["a fractional duration", { duration: 1.5 }, /duration/],
  ["tracks as an array", { tracks: [] }, /tracks/],
])("assertManifest rejects %s", (_name, patch, message) => {
  const value =
    typeof patch === "object" && !Array.isArray(patch) ? { ...minimal(), ...patch } : patch;
  expect(() => assertManifest(value)).toThrow(message);
});
