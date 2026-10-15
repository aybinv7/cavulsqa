/**
 * How far a bar that scrolls away with the content - Compose's `enterAlwaysScrollBehavior` - is
 * pushed off: it follows every pixel the content moves, up to its own height, and it cannot be
 * further off than the content is scrolled, so it is whole again at the top.
 */
export function followOffset(
  offset: number,
  delta: number,
  scrollTop: number,
  height: number,
): number {
  const next = Math.min(height, Math.max(0, offset + delta));
  return Math.max(0, Math.min(next, scrollTop));
}

export interface FollowState {
  offset: number;
  /** Movement in the current direction since it last changed or since the bar last settled. */
  travel: number;
}

/**
 * `followOffset` behind a deadband: the bar holds still until the content has moved `threshold`
 * pixels one way, and a reversal starts the count again, so a jittery finger, a tap that nudges the
 * list or a short drag leave it where it is. Past the threshold it follows every pixel from the
 * excess, so it never jumps, and it still cannot be further off than the content is scrolled.
 */
export function followPastThreshold(
  state: FollowState,
  delta: number,
  scrollTop: number,
  height: number,
  threshold = 24,
): FollowState {
  const sameWay = Math.sign(delta) === Math.sign(state.travel);
  const travel = delta === 0 ? state.travel : sameWay ? state.travel + delta : delta;
  const excess = Math.max(0, Math.abs(travel) - threshold);
  const moved = Math.sign(delta) * Math.min(Math.abs(delta), excess);
  return { offset: followOffset(state.offset, moved, scrollTop, height), travel };
}

/** Where a half-hidden bar settles once the scroll stops: the nearer of fully in and fully out. */
export function snapOffset(offset: number, scrollTop: number, height: number): number {
  if (scrollTop < height) return 0;
  return offset > height / 2 ? height : 0;
}

export interface HideState {
  hidden: boolean;
  /** Movement in the current direction since it last changed. */
  travel: number;
}

/**
 * Material's hide-on-scroll for a bottom bar: scrolling down past `threshold` hides it, scrolling
 * up past it brings it back, and it always shows at the top and at the very end of the content.
 * Travel resets when the direction flips, so a jittery finger does not make it flicker.
 */
export function nextHideState(
  state: HideState,
  delta: number,
  position: { top: number; max: number },
  threshold = 24,
): HideState {
  if (position.top <= threshold || position.top >= position.max - 1)
    return { hidden: false, travel: 0 };
  if (delta === 0) return state;
  const sameWay = Math.sign(delta) === Math.sign(state.travel);
  const travel = sameWay ? state.travel + delta : delta;
  if (travel > threshold) return { hidden: true, travel };
  if (travel < -threshold) return { hidden: false, travel };
  return { hidden: state.hidden, travel };
}
