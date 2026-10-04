import { strToU8, zip, zipSync, type Zippable } from "fflate";
import { TRACK_NAMES, type CapuEvent, type SessionManifest, type TrackName } from "./types.js";

/** One track's segment contents, oldest to newest, each element being a whole segment's NDJSON text. */
export type TrackSegments = AsyncIterable<string> | Iterable<string>;

export interface BuildArchiveInput {
  manifest: SessionManifest;
  tracks: Partial<Record<TrackName, TrackSegments>>;
  /** Capture time used to compute the rebased `manifest.duration`. Defaults to `Date.now()`. */
  now?: number;
  /** Serialized to `capu/producer.json` for support use; omitted when not given. */
  producer?: Record<string, unknown>;
}

export interface BuildArchiveOutput {
  archive: Uint8Array;
  manifest: SessionManifest;
}

interface RrwebLikeEvent {
  type?: number;
}

interface CollectedTrack {
  events: CapuEvent[];
  malformed: number;
}

/**
 * Parses a track's segments, skipping any line that is not valid JSON instead of failing the whole
 * archive. A session recovered after an unexpected exit routinely ends in a half-written line, and
 * dropping that one event is better than losing the entire recording.
 */
async function collectEvents(segments: TrackSegments): Promise<CollectedTrack> {
  const events: CapuEvent[] = [];
  let malformed = 0;
  for await (const chunk of segments) {
    for (const rawLine of chunk.split("\n")) {
      const line = rawLine.trim();
      if (line.length === 0) continue;
      try {
        events.push(JSON.parse(line) as CapuEvent);
      } catch {
        malformed += 1;
      }
    }
  }
  return { events, malformed };
}

/** The offset into `events` of the first `Meta` (type 4) event followed by a `FullSnapshot` (type 2). */
function findRrwebTrimIndex(events: CapuEvent[]): number {
  for (let i = 0; i < events.length - 1; i++) {
    const meta = events[i]?.data as RrwebLikeEvent | undefined;
    const full = events[i + 1]?.data as RrwebLikeEvent | undefined;
    if (meta?.type === 4 && full?.type === 2) return i;
  }
  return 0;
}

function toNdjson(events: CapuEvent[]): Uint8Array {
  if (events.length === 0) return strToU8("");
  return strToU8(events.map((event) => JSON.stringify(event)).join("\n") + "\n");
}

function zipAsync(data: Zippable): Promise<Uint8Array> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(zipSync(data));
  }
  return new Promise((resolve, reject) => {
    zip(data, {}, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Builds a `.capu` zip from retained segments. Trims the rrweb track to its first full snapshot,
 * rebases every track's `t` so the earliest retained rrweb event is `t >= 0`, and updates
 * `manifest.startedAt` and `manifest.duration` (against `now`) to match.
 */
export async function buildArchive(input: BuildArchiveInput): Promise<BuildArchiveOutput> {
  const now = input.now ?? Date.now();
  const eventsByTrack = new Map<TrackName, CapuEvent[]>();
  const malformedByTrack: string[] = [];

  for (const track of TRACK_NAMES) {
    const segments = input.tracks[track];
    if (!segments) continue;
    const collected = await collectEvents(segments);
    eventsByTrack.set(track, collected.events);
    if (collected.malformed > 0) {
      malformedByTrack.push(`${track}: skipped ${String(collected.malformed)} unreadable line(s)`);
    }
  }

  const rrwebEvents = eventsByTrack.get("rrweb");
  let tOffset = 0;
  if (rrwebEvents && rrwebEvents.length > 0) {
    const trimIndex = findRrwebTrimIndex(rrwebEvents);
    const trimmed = rrwebEvents.slice(trimIndex);
    eventsByTrack.set("rrweb", trimmed);
    tOffset = trimmed[0]?.t ?? 0;
  }

  const rebasedByTrack = new Map<TrackName, CapuEvent[]>();
  for (const [track, events] of eventsByTrack) {
    const rebased = events
      .map((event) => ({ t: event.t - tOffset, data: event.data }))
      .filter((event) => event.t >= 0);
    rebasedByTrack.set(track, rebased);
  }

  const startedAt = input.manifest.startedAt + tOffset;
  const duration = Math.max(0, now - startedAt);
  const manifest: SessionManifest = { ...input.manifest, startedAt, duration };
  if (malformedByTrack.length > 0) {
    manifest.incomplete = {
      errors: [...(input.manifest.incomplete?.errors ?? []), ...malformedByTrack],
      missingTracks: input.manifest.incomplete?.missingTracks ?? [],
    };
  }

  const zipInput: Zippable = {
    "manifest.json": strToU8(JSON.stringify(manifest)),
  };
  if (input.producer) {
    zipInput["capu/producer.json"] = strToU8(JSON.stringify(input.producer));
  }
  for (const [track, events] of rebasedByTrack) {
    zipInput[`tracks/${track}.ndjson`] = toNdjson(events);
  }

  const archive = await zipAsync(zipInput);
  return { archive, manifest };
}
