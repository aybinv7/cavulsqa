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
