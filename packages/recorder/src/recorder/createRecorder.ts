import packageJson from "../../package.json" with { type: "json" };
import { buildArchive } from "../capu/archive.js";
import { createManifest } from "../capu/manifest.js";
import { createSessionId } from "../capu/sessionId.js";
import {
  createMemorySegmentStore,
  createOpfsSegmentStore,
  writeOpfsManifestSnapshot,
  type SegmentMeta,
  type SegmentStore,
} from "../capu/segmentStore.js";
import {
  TRACK_NAMES,
  type SessionManifest,
  type TrackConfig,
  type TrackName,
} from "../capu/types.js";
import { silentLogger } from "./logger.js";
import { recoverLeftoverSessions } from "./recover.js";
import { decideEviction } from "./retention.js";
import {
  DEFAULT_RETENTION,
  type RecorderOptions,
  type TrackContext,
  type TrackRecorder,
} from "./types.js";

const RECORDER_VERSION = packageJson.version;
const TRACK_START_DEADLINE_MS = 5000;
const ROTATE_INTERVAL_MS = 60_000;

export interface RecorderStatus {
  recording: boolean;
  sessionId: string | null;
  startedAt: number | null;
  backend: "memory" | "opfs" | null;
  lastError: string | null;
}

export interface Recorder {
  start(): Promise<void>;
  stop(): Promise<void>;
  capture(reason: string): Promise<void>;
  recover(): Promise<void>;
  readonly status: RecorderStatus;
}

function buildTrackConfig(tracks: TrackRecorder[]): TrackConfig {
  const names = new Set(tracks.map((track) => track.name));
  return {
    rrweb: names.has("rrweb"),
    network: names.has("network"),
    console: names.has("console"),
    perf: names.has("perf"),
    databases: names.has("databases"),
  };
}

async function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function* readSegments(
  store: SegmentStore,
  track: TrackName,
  segments: SegmentMeta[],
): AsyncIterable<string> {
  for (const segment of [...segments].sort((a, b) => a.index - b.index)) {
    yield await store.read(track, segment.index);
  }
}

/**
 * Builds the in-app recorder lifecycle: starts every track in parallel, buffers events into a
 * bounded ring buffer, and finalizes a `.capu` archive on `capture()` or `stop()` without ever
 * throwing into the host app. `recover()` finalizes leftover sessions from a previous run.
 */
export function createRecorder(options: RecorderOptions): Recorder {
  const logger = options.logger ?? silentLogger;
  const retention = { ...DEFAULT_RETENTION, ...options.retention };

  let sessionId: string | null = null;
  let startedAt: number | null = null;
  let store: SegmentStore | null = null;
  let recording = false;
  let lastError: string | null = null;
  let activeTracks: TrackRecorder[] = [];
  let incompleteErrors: string[] = [];
  let missingTracks: string[] = [];
  let rotateTimer: ReturnType<typeof setInterval> | null = null;
  let visibilityHandler: (() => void) | null = null;

  function rotateActiveTracks(): void {
    if (!store) return;
    for (const track of activeTracks) void store.rotate(track.name);
  }

  function teardownTimers(): void {
    if (rotateTimer !== null) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
    if (visibilityHandler !== null && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  }

  async function start(): Promise<void> {
    if (recording) return;

    sessionId = createSessionId();
    startedAt = Date.now();
    incompleteErrors = [];
    missingTracks = [];
    lastError = null;
    activeTracks = [];

    try {
      store = await createOpfsSegmentStore(sessionId);
    } catch (err) {
      logger.warn(`OPFS segment store unavailable, using memory: ${errorMessage(err)}`);
      store = createMemorySegmentStore();
    }

    const initialManifest = createManifest({
      label: options.label,
      tracks: buildTrackConfig(options.tracks),
      sessionId,
      startedAt,
      device: {
        model: null,
        osVersion: null,
        webviewVersion: null,
        appId: options.appId,
        appVersion: options.appVersion,
      },
    });
    void writeOpfsManifestSnapshot(sessionId, JSON.stringify(initialManifest));

    const capturedStartedAt = startedAt;
    const capturedStore = store;

    await Promise.all(
      options.tracks.map(async (track) => {
        const ctx: TrackContext = {
          startedAt: capturedStartedAt,
          logger,
          push(data, wallMs) {
            const t = (wallMs ?? Date.now()) - capturedStartedAt;
            const line = JSON.stringify({ t, data }) + "\n";
            void capturedStore.append(track.name, line).catch((err: unknown) => {
              logger.warn(`failed to append to ${track.name}: ${errorMessage(err)}`);
            });
          },
        };
        try {
          await withDeadline(track.start(ctx), TRACK_START_DEADLINE_MS);
          activeTracks.push(track);
        } catch (err) {
          incompleteErrors.push(`${track.name}: ${errorMessage(err)}`);
          missingTracks.push(track.name);
        }
      }),
    );

    rotateTimer = setInterval(rotateActiveTracks, ROTATE_INTERVAL_MS);
    if (typeof document !== "undefined") {
      visibilityHandler = () => {
        if (document.visibilityState === "hidden") rotateActiveTracks();
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    recording = true;
  }

  async function stopTracks(): Promise<void> {
    const tracks = activeTracks;
    activeTracks = [];
    await Promise.all(
      tracks.map(async (track) => {
        try {
          await track.stop();
        } catch (err) {
          logger.warn(`failed to stop ${track.name}: ${errorMessage(err)}`);
        }
      }),
    );
  }

  async function finalize(reason: string, clearAfter: boolean): Promise<void> {
    if (!store || sessionId === null || startedAt === null) return;
    const currentStore = store;

    const segmentsByTrack: Partial<Record<TrackName, SegmentMeta[]>> = {};
    for (const track of TRACK_NAMES) {
      const list = await currentStore.list(track);
      if (list.length > 0) segmentsByTrack[track] = list;
    }

    const evictionPlan = decideEviction(segmentsByTrack, retention, Date.now());
    for (const track of TRACK_NAMES) {
      for (const index of evictionPlan[track] ?? []) await currentStore.evict(track, index);
    }

    const manifest: SessionManifest = createManifest({
      label: `${options.label} · ${reason}`,
      tracks: buildTrackConfig(options.tracks),
      sessionId,
      startedAt,
      device: {
        model: null,
        osVersion: null,
        webviewVersion: null,
        appId: options.appId,
        appVersion: options.appVersion,
      },
      incomplete:
        incompleteErrors.length > 0
          ? { errors: [...incompleteErrors], missingTracks: [...missingTracks] }
          : undefined,
      producer: { name: "@cavulsqa/recorder", version: RECORDER_VERSION, platform: "capacitor" },
    });

    const trackSegments: Partial<Record<TrackName, AsyncIterable<string>>> = {};
    for (const track of TRACK_NAMES) {
      const list = await currentStore.list(track);
      if (list.length > 0) trackSegments[track] = readSegments(currentStore, track, list);
    }

    let built;
    try {
      built = await buildArchive({
        manifest,
        tracks: trackSegments,
        now: Date.now(),
        producer: {
          recorderVersion: RECORDER_VERSION,
          reason,
          label: options.label,
          retention,
          backend: currentStore.backend,
        },
      });
    } catch (err) {
      lastError = `archive build failed: ${errorMessage(err)}`;
      logger.warn(lastError);
      return;
    }

    try {
      await options.sink.save(built.archive, built.manifest);
      lastError = null;
      if (clearAfter) await currentStore.clear();
    } catch (err) {
      lastError = `sink failed: ${errorMessage(err)}`;
      logger.warn(lastError, err);
    }
  }

  async function capture(reason: string): Promise<void> {
    if (!recording) return;
    await finalize(reason, false);
  }

  async function stop(): Promise<void> {
    if (!recording) return;
    teardownTimers();
    await stopTracks();
    await finalize("stop", true);
    recording = false;
    store = null;
  }

  async function recover(): Promise<void> {
    await recoverLeftoverSessions({ sink: options.sink, logger });
  }

  return {
    start,
    stop,
    capture,
    recover,
    get status(): RecorderStatus {
      return {
        recording,
        sessionId,
        startedAt,
        backend: store?.backend ?? null,
        lastError,
      };
    },
  };
}
