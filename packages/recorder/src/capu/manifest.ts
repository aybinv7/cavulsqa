import type {
  DatabaseTrackConfig,
  ManifestDevice,
  ManifestIncomplete,
  ManifestProducer,
  SessionManifest,
  TrackConfig,
} from "./types.js";
import { createSessionId, isValidSessionId } from "./sessionId.js";

export interface CreateManifestInput {
  label: string;
  tracks: TrackConfig;
  sessionId?: string;
  startedAt?: number;
  targetUrl?: string | null;
  appPackage?: string | null;
  databaseTracks?: DatabaseTrackConfig;
  incomplete?: ManifestIncomplete;
  producer?: ManifestProducer;
  device?: ManifestDevice;
}

/**
 * A version 1 manifest with `deviceSerial: null` and `duration: 0`. When no `sessionId` is given
 * the id is minted from `startedAt`, so the timestamp in the id matches the manifest epoch. The
 * lifecycle fills `duration` and `incomplete` when the session is finalized.
 */
export function createManifest(input: CreateManifestInput): SessionManifest {
  const startedAt = input.startedAt ?? Date.now();
  const manifest: SessionManifest = {
    version: 1,
    sessionId: input.sessionId ?? createSessionId(startedAt),
    label: input.label,
    startedAt,
    duration: 0,
    deviceSerial: null,
    targetUrl: input.targetUrl ?? null,
    appPackage: input.appPackage ?? null,
    tracks: { ...input.tracks },
  };
  if (input.databaseTracks) manifest.databaseTracks = { ...input.databaseTracks };
  if (input.incomplete) {
    manifest.incomplete = {
      errors: [...input.incomplete.errors],
      missingTracks: [...input.incomplete.missingTracks],
    };
  }
  if (input.producer) manifest.producer = { ...input.producer };
  if (input.device) manifest.device = { ...input.device };
  return manifest;
}

export class ManifestError extends Error {
  override readonly name = "ManifestError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnsignedInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Enforces exactly what Capubridge's `validate_manifest_json` enforces: `version === 1`, a valid
 * `sessionId` (equal to `expectedSessionId` when given), string `label`, unsigned integer
 * `startedAt` and `duration`, object `tracks`. Extra keys pass. Throws `ManifestError`.
 */
export function assertManifest(
  manifest: unknown,
  expectedSessionId?: string,
): asserts manifest is SessionManifest {
  if (!isRecord(manifest)) {
    throw new ManifestError("Invalid recording manifest: expected an object");
  }
  if (manifest.version !== 1) {
    throw new ManifestError("Invalid recording manifest: version must be 1");
  }
  const sessionId = manifest.sessionId;
  if (typeof sessionId !== "string" || !isValidSessionId(sessionId)) {
    throw new ManifestError("Invalid recording manifest: sessionId is not a valid session id");
  }
  if (expectedSessionId !== undefined && sessionId !== expectedSessionId) {
    throw new ManifestError("Invalid recording manifest: sessionId does not match recording");
  }
  if (typeof manifest.label !== "string") {
    throw new ManifestError("Invalid recording manifest: label must be a string");
  }
  if (!isUnsignedInteger(manifest.startedAt)) {
    throw new ManifestError("Invalid recording manifest: startedAt must be an unsigned integer");
  }
  if (!isUnsignedInteger(manifest.duration)) {
    throw new ManifestError("Invalid recording manifest: duration must be an unsigned integer");
  }
  if (!isRecord(manifest.tracks)) {
    throw new ManifestError("Invalid recording manifest: tracks must be an object");
  }
}
