import type { SessionManifest, TrackName } from "../capu/types.js";
import type { RecorderLogger } from "./logger.js";

/**
 * Receives the finished `.capu` bytes. The package never uploads or writes to disk; the consuming
 * app decides where the archive goes (Capacitor Filesystem, share sheet, upload).
 */
export interface RecorderSink {
  save(archive: Uint8Array, manifest: SessionManifest): Promise<void>;
}

/** Ring buffer bounds. Whichever limit is hit first evicts the oldest segment. */
export interface RecorderRetention {
  maxMs: number;
  maxBytes: number;
}

export const DEFAULT_RETENTION: Readonly<RecorderRetention> = {
  maxMs: 10 * 60 * 1000,
  maxBytes: 20 * 1024 * 1024,
};

/** Handed to a `TrackRecorder` by the lifecycle when the session starts. */
export interface TrackContext<T = unknown> {
  /** Appends one event. `wallMs` defaults to `Date.now()`; the offset `t` is derived from `startedAt`. */
  push(data: T, wallMs?: number): void;
  readonly startedAt: number;
  readonly logger: RecorderLogger;
}

/**
 * One track. `start` installs hooks and begins pushing events; `stop` removes every hook. A
 * `start` that throws records the error into `incomplete.errors` and the session continues
 * without this track.
 */
export interface TrackRecorder<T = unknown> {
  readonly name: TrackName;
  start(ctx: TrackContext<T>): Promise<void>;
  stop(): Promise<void>;
}

export interface RecorderOptions {
  tracks: TrackRecorder[];
  sink: RecorderSink;
  label: string;
  appId: string;
  appVersion: string;
  retention?: Partial<RecorderRetention>;
  logger?: RecorderLogger;
}
