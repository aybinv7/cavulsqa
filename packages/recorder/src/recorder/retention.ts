import { TRACK_NAMES, type TrackName } from "../capu/types.js";
import type { SegmentMeta } from "../capu/segmentStore.js";
import type { RecorderRetention } from "./types.js";

/** Per-track segment indices to evict, decided against `retention` and `now`. */
export type EvictionPlan = Partial<Record<TrackName, number[]>>;

/**
 * Decides which segments to evict per track. A track evicts its own oldest segments while it
 * exceeds `maxMs` or `maxBytes`, always keeping at least its newest segment. Afterward, every
 * non-rrweb track additionally evicts any segment older than the oldest surviving rrweb segment,
 * so no track retains events from before the rrweb ring buffer's oldest full snapshot.
 */
export function decideEviction(
  segmentsByTrack: Partial<Record<TrackName, SegmentMeta[]>>,
  retention: RecorderRetention,
  now: number,
): EvictionPlan {
  const plan: EvictionPlan = {};
  const survivors: Partial<Record<TrackName, SegmentMeta[]>> = {};

  for (const track of TRACK_NAMES) {
    const segments = segmentsByTrack[track];
    if (!segments || segments.length === 0) continue;
    const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
    const evicted: number[] = [];
    let totalBytes = sorted.reduce((sum, segment) => sum + segment.bytes, 0);
    let keepFrom = 0;
    while (keepFrom < sorted.length - 1) {
      const segment = sorted[keepFrom];
      if (!segment) break;
      const tooOld = now - segment.startMs > retention.maxMs;
      const tooBig = totalBytes > retention.maxBytes;
      if (!tooOld && !tooBig) break;
      evicted.push(segment.index);
      totalBytes -= segment.bytes;
      keepFrom++;
    }
    plan[track] = evicted;
    survivors[track] = sorted.slice(keepFrom);
  }

  const rrwebSurvivors = survivors.rrweb;
  const rrwebFloor = rrwebSurvivors?.[0]?.startMs;
  if (rrwebFloor !== undefined) {
    for (const track of TRACK_NAMES) {
      if (track === "rrweb") continue;
      const segments = survivors[track];
      if (!segments) continue;
      const already = new Set(plan[track] ?? []);
      for (const segment of segments) {
        if (segment.startMs < rrwebFloor) already.add(segment.index);
      }
      if (already.size > 0) plan[track] = [...already].sort((a, b) => a - b);
    }
  }

  return plan;
}
