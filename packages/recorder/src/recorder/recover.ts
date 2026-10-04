import { buildArchive } from "../capu/archive.js";
import { assertManifest, ManifestError } from "../capu/manifest.js";
import {
  listOpfsSessionIds,
  readOpfsManifestSnapshot,
  readOpfsTrackSegments,
  removeOpfsSession,
} from "../capu/segmentStore.js";
import { TRACK_NAMES, type SessionManifest, type TrackName } from "../capu/types.js";
import { silentLogger } from "./logger.js";
import type { RecorderLogger } from "./logger.js";
import type { RecorderSink } from "./types.js";

const MAX_RECOVERABLE_SESSIONS = 3;

export interface RecoverOptions {
  sink: RecorderSink;
  logger?: RecorderLogger;
  /** The currently active session id, if any, excluded from recovery. */
  activeSessionId?: string | null;
}

async function recoverSession(
  sessionId: string,
  sink: RecorderSink,
  logger: RecorderLogger,
): Promise<void> {
  const snapshotJson = await readOpfsManifestSnapshot(sessionId);
  if (snapshotJson === null) {
    logger.warn(`no manifest snapshot for leftover session ${sessionId}, discarding it`);
    await removeOpfsSession(sessionId);
    return;
  }

  let manifest: SessionManifest;
  try {
    const parsed: unknown = JSON.parse(snapshotJson);
    assertManifest(parsed, sessionId);
    manifest = parsed;
  } catch (err) {
    const message = err instanceof ManifestError ? err.message : String(err);
    logger.warn(`invalid manifest snapshot for leftover session ${sessionId}: ${message}`);
    await removeOpfsSession(sessionId);
    return;
  }

  const tracks: Partial<Record<TrackName, string[]>> = {};
  for (const track of TRACK_NAMES) {
    const segments = await readOpfsTrackSegments(sessionId, track);
    if (segments.length > 0) tracks[track] = segments;
  }

  const { archive, manifest: finalManifest } = await buildArchive({
    manifest: {
      ...manifest,
      incomplete: { errors: ["recovered after unexpected exit"], missingTracks: [] },
    },
    tracks,
    now: Date.now(),
  });

  await sink.save(archive, finalManifest);
  await removeOpfsSession(sessionId);
}

/**
 * Finalizes leftover sessions left in OPFS by a previous run that never reached `stop()`. Bounded
 * to `MAX_RECOVERABLE_SESSIONS` per boot; older leftovers beyond that are dropped with a warning.
 * A session directory is deleted only after the sink has resolved.
 */
export async function recoverLeftoverSessions(options: RecoverOptions): Promise<void> {
  const logger = options.logger ?? silentLogger;
  const allSessionIds = await listOpfsSessionIds();
  const sessionIds = allSessionIds.filter((id) => id !== options.activeSessionId);
  if (sessionIds.length === 0) return;

  const toRecover = sessionIds.slice(0, MAX_RECOVERABLE_SESSIONS);
  const toDrop = sessionIds.slice(MAX_RECOVERABLE_SESSIONS);

  for (const sessionId of toDrop) {
    logger.warn(`dropping leftover recording session beyond recovery limit: ${sessionId}`);
    await removeOpfsSession(sessionId);
  }

  for (const sessionId of toRecover) {
    try {
      await recoverSession(sessionId, options.sink, logger);
    } catch (err) {
      logger.warn(`failed to recover leftover session ${sessionId}: ${String(err)}`);
    }
  }
}
