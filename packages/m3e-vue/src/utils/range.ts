/** The arithmetic of a two-handle slider, pure so every edge case is testable. */
export type RangeThumb = "start" | "end";

/**
 * The handle a press moves - Compose's rule: the nearer one, and on a tie (both handles stacked)
 * the one on the side the press lands, so a stacked pair can always be pulled apart.
 */
export function nearestThumb(value: number, start: number, end: number): RangeThumb {
  const toStart = Math.abs(value - start);
  const toEnd = Math.abs(value - end);
  if (toStart === toEnd) return value < start ? "start" : "end";
  return toStart < toEnd ? "start" : "end";
}

/** Rounds to the step from `min` and clamps to `min`..`max`, without float dust. */
export function snapValue(raw: number, min: number, max: number, step: number): number {
  const stepped = step > 0 ? Math.round((raw - min) / step) * step + min : raw;
  return Number(Math.min(max, Math.max(min, stepped)).toFixed(10));
}

/**
 * Moves one handle and keeps the pair ordered with at least `minDistance` between them: a handle
 * pushed into the other stops short of it rather than swapping or dragging it along.
 */
export function moveThumb(
  thumb: RangeThumb,
  next: number,
  range: { start: number; end: number },
  bounds: { min: number; max: number; step: number; minDistance: number },
): { start: number; end: number } {
  const snapped = snapValue(next, bounds.min, bounds.max, bounds.step);
  if (thumb === "start") {
    return { start: Math.min(snapped, range.end - bounds.minDistance), end: range.end };
  }
  return { start: range.start, end: Math.max(snapped, range.start + bounds.minDistance) };
}
