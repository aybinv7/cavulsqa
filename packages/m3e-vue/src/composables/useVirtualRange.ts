/**
 * Cumulative offsets for rows of known size, and the slice of rows a viewport shows. Pure, so the
 * arithmetic is testable without a DOM: an off-by-one here is a row that never renders.
 */
export function prefixOffsets(count: number, size: (index: number) => number): Float64Array {
  const offsets = new Float64Array(count + 1);
  for (let i = 0; i < count; i++) offsets[i + 1] = offsets[i]! + Math.max(0, size(i));
  return offsets;
}

/** The last row whose top is at or above `position` - a binary search over the offsets. */
export function rowAt(offsets: Float64Array, position: number): number {
  let low = 0;
  let high = offsets.length - 2;
  if (high < 0) return 0;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid]! <= position) low = mid;
    else high = mid - 1;
  }
  return low;
}

export interface VirtualRange {
  start: number;
  end: number;
}

/** Rows intersecting `[top, top + height]`, widened by `overscan` rows each way. End is exclusive. */
export function visibleRange(
  offsets: Float64Array,
  top: number,
  height: number,
  overscan: number,
): VirtualRange {
  const count = offsets.length - 1;
  if (count <= 0) return { start: 0, end: 0 };
  const first = rowAt(offsets, Math.max(0, top));
  const last = rowAt(offsets, Math.max(0, top + height));
  return {
    start: Math.max(0, first - overscan),
    end: Math.min(count, last + 1 + overscan),
  };
}

/**
 * `visibleRange` stretched ahead of a moving scroll by `lead` px - positive while scrolling down,
 * negative while scrolling up - so a fling finds rows already built where it is heading.
 */
export function leadingRange(
  offsets: Float64Array,
  top: number,
  height: number,
  overscan: number,
  lead: number,
): VirtualRange {
  const before = Math.max(0, -lead);
  const after = Math.max(0, lead);
  return visibleRange(offsets, top - before, height + before + after, overscan);
}

/**
 * Gives each row in `[start, end)` a slot that survives scrolling: rows still in range keep theirs,
 * rows entering reuse the slots of rows that left. Keying a list by slot turns a scroll into prop
 * patches on existing DOM instead of unmounting and mounting whole rows.
 */
export function assignSlots(
  previous: ReadonlyMap<number, number>,
  start: number,
  end: number,
): Map<number, number> {
  const next = new Map<number, number>();
  const used = new Set<number>();
  for (let index = start; index < end; index++) {
    const slot = previous.get(index);
    if (slot !== undefined) {
      next.set(index, slot);
      used.add(slot);
    }
  }
  const free: number[] = [];
  for (const [index, slot] of previous) if (!next.has(index) && !used.has(slot)) free.push(slot);
  free.sort((a, b) => b - a);
  let fresh = 0;
  for (let index = start; index < end; index++) {
    if (next.has(index)) continue;
    let slot = free.pop();
    while (slot === undefined && used.has(fresh)) fresh++;
    if (slot === undefined) slot = fresh++;
    next.set(index, slot);
    used.add(slot);
  }
  return next;
}
