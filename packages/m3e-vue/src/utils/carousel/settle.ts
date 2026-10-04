import { MIN_FLING_VELOCITY, flingDistance } from "../fling.js";

/**
 * Where a released carousel comes to rest, after Compose's three fling behaviours: `multi` lets a
 * fling travel as far as its decay carries it (`multiBrowseFlingBehavior`), `single` moves at most
 * one item from where the drag began (`singleAdvanceFlingBehavior`), and `none` coasts to wherever
 * the decay stops (`noSnapFlingBehavior`). A release slower than the fling threshold goes to the
 * nearest item, or on to the next one once the drag travelled `min(56dp, half an item)`.
 */
export type CarouselFling = "multi" | "single" | "none";

export interface SettleRequest {
  /** The snap offset of every item, in item order. */
  snaps: readonly number[];
  scroll: number;
  /** Scroll velocity in px per second, positive toward the end. */
  velocity: number;
  /** The item that was current when the drag began. */
  startIndex: number;
  fling: CarouselFling;
  itemSize: number;
  maxScroll: number;
}

export interface SettleTarget {
  offset: number;
  /** The item the carousel rests on; null when it coasts freely. */
  index: number | null;
}

function nearestIndex(snaps: readonly number[], offset: number): number {
  let best = 0;
  snaps.forEach((snap, index) => {
    if (Math.abs(snap - offset) < Math.abs(snaps[best]! - offset)) best = index;
  });
  return best;
}

const clampIndex = (index: number, snaps: readonly number[]) =>
  Math.min(snaps.length - 1, Math.max(0, index));

export function settleCarousel(request: SettleRequest): SettleTarget {
  const { snaps, scroll, velocity, startIndex, fling, maxScroll } = request;
  if (fling === "none" || snaps.length === 0) {
    const offset = Math.min(maxScroll, Math.max(0, scroll + flingDistance(velocity)));
    return { offset, index: snaps.length > 0 ? nearestIndex(snaps, offset) : null };
  }

  const direction = Math.sign(velocity);
  let index: number;
  if (Math.abs(velocity) < MIN_FLING_VELOCITY) {
    index = nearestIndex(snaps, scroll);
    const travelled = scroll - snaps[clampIndex(startIndex, snaps)]!;
    const threshold = Math.min(56, request.itemSize / 2);
    if (index === startIndex && Math.abs(travelled) >= threshold) {
      index = clampIndex(startIndex + Math.sign(travelled), snaps);
    }
  } else if (fling === "single") {
    const ahead = snaps.findIndex((snap) => (direction > 0 ? snap > scroll + 0.5 : false));
    const behind = snaps.findLastIndex((snap) => (direction < 0 ? snap < scroll - 0.5 : false));
    const next = direction > 0 ? (ahead < 0 ? snaps.length - 1 : ahead) : Math.max(0, behind);
    index = Math.min(startIndex + 1, Math.max(startIndex - 1, next));
    index = clampIndex(index, snaps);
  } else {
    index = nearestIndex(snaps, scroll + flingDistance(velocity));
    const passed = direction > 0 ? snaps[index]! <= scroll : snaps[index]! >= scroll;
    if (passed) index = clampIndex(index + direction, snaps);
  }
  return { offset: snaps[index]!, index };
}
