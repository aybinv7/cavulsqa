/**
 * The arithmetic of swipe actions on a list row. Offsets are px along the row's inline axis:
 * positive reveals the start actions, negative the end ones. Pure, so every threshold is testable.
 */
export type SwipeSide = "start" | "end";
export type SwipeOutcome = SwipeSide | "full-start" | "full-end" | null;

/** Compose's `SwipeToDismissBox` velocity threshold: 125dp/s. */
export const SWIPE_VELOCITY = 125;
/** How far past the actions a full swipe has to travel, at least - Compose's positional 56dp. */
export const FULL_SWIPE_EXTRA = 56;

export interface SwipeLimits {
  startWidth: number;
  endWidth: number;
  rowWidth: number;
  fullStart: boolean;
  fullEnd: boolean;
}

/** The offset past which releasing fires the side's outermost action. */
export function fullSwipeThreshold(actionsWidth: number, rowWidth: number): number {
  return Math.max(actionsWidth + FULL_SWIPE_EXTRA, rowWidth * 0.5);
}

/**
 * Where the row sits for a raw drag offset. A side with no actions does not move; past its actions
 * the row resists the finger as Framework7's swipeout does (`excess ^ 0.8`), unless that side
 * allows a full swipe, which has to be reachable.
 */
export function swipeOffset(raw: number, limits: SwipeLimits): number {
  const side: SwipeSide = raw >= 0 ? "start" : "end";
  const width = side === "start" ? limits.startWidth : limits.endWidth;
  if (width <= 0) return 0;
  const distance = Math.abs(raw);
  const full = side === "start" ? limits.fullStart : limits.fullEnd;
  const travelled =
    full || distance <= width
      ? Math.min(distance, limits.rowWidth)
      : width + (distance - width) ** 0.8;
  return raw >= 0 ? travelled : -travelled;
}

/** Whether the row has travelled far enough that letting go would fire a full swipe. */
export function fullSwipeArmed(offset: number, limits: SwipeLimits): boolean {
  if (offset > 0)
    return limits.fullStart && offset >= fullSwipeThreshold(limits.startWidth, limits.rowWidth);
  if (offset < 0)
    return limits.fullEnd && -offset >= fullSwipeThreshold(limits.endWidth, limits.rowWidth);
  return false;
}

/**
 * What a release decides: a full swipe past its threshold; otherwise a fling of 125dp/s opens the
 * side it moves toward or closes the row when moving back; otherwise the row opens once more than
 * half of the actions show.
 */
export function settleSwipe(offset: number, velocity: number, limits: SwipeLimits): SwipeOutcome {
  if (offset === 0) return null;
  const side: SwipeSide = offset > 0 ? "start" : "end";
  if (fullSwipeArmed(offset, limits)) return side === "start" ? "full-start" : "full-end";
  const width = side === "start" ? limits.startWidth : limits.endWidth;
  const outward = side === "start" ? velocity : -velocity;
  if (outward > SWIPE_VELOCITY) return side;
  if (outward < -SWIPE_VELOCITY) return null;
  return Math.abs(offset) > width / 2 ? side : null;
}

/** The resting offset for an open side. */
export function openOffset(side: SwipeSide | null, limits: SwipeLimits): number {
  if (side === "start") return limits.startWidth;
  if (side === "end") return -limits.endWidth;
  return 0;
}
