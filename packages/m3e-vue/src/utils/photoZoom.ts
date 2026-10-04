/**
 * The geometry of a zoomable photo pager, pure so every bound is testable. Points and pans are
 * measured from the viewport's centre; a pan moves the scaled photo, and the photo is fitted
 * inside the viewport at scale 1.
 */
export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;

/** The photo's size at scale 1: as large as fits, never cropped. */
export function fitSize(natural: Size, viewport: Size): Size {
  if (natural.width <= 0 || natural.height <= 0) return { ...viewport };
  const ratio = Math.min(viewport.width / natural.width, viewport.height / natural.height);
  return { width: natural.width * ratio, height: natural.height * ratio };
}

/** How far the scaled photo may move from centre before an edge comes inside the viewport. */
export function panBounds(fit: Size, viewport: Size, scale: number): Point {
  return {
    x: Math.max(0, (fit.width * scale - viewport.width) / 2),
    y: Math.max(0, (fit.height * scale - viewport.height) / 2),
  };
}

export function clampPan(pan: Point, bounds: Point): Point {
  return {
    x: Math.min(bounds.x, Math.max(-bounds.x, pan.x)),
    y: Math.min(bounds.y, Math.max(-bounds.y, pan.y)),
  };
}

/** Past a bound the photo still follows the finger, at a third of the distance. */
export function resistPan(pan: Point, bounds: Point): Point {
  const resist = (value: number, limit: number) =>
    value > limit
      ? limit + (value - limit) / 3
      : value < -limit
        ? -limit + (value + limit) / 3
        : value;
  return { x: resist(pan.x, bounds.x), y: resist(pan.y, bounds.y) };
}

/** The pan that keeps `point` under the finger while the scale goes from `from` to `to`. */
export function zoomAround(point: Point, pan: Point, from: number, to: number): Point {
  const ratio = to / from;
  return { x: point.x - (point.x - pan.x) * ratio, y: point.y - (point.y - pan.y) * ratio };
}

/** Pinching beyond the limits gives way slowly, then springs back on release. */
export function resistScale(scale: number): number {
  if (scale < 1) return 1 - (1 - scale) / 3;
  if (scale > MAX_SCALE) return MAX_SCALE + (scale - MAX_SCALE) / 3;
  return scale;
}

/**
 * The page a released swipe lands on: the next one past a quarter of the width or on a fling in
 * its direction, else the same one. Never past either end.
 */
export function pageTarget(
  index: number,
  count: number,
  dx: number,
  vx: number,
  width: number,
): number {
  const flung = Math.abs(vx) >= 500 && Math.sign(vx) === Math.sign(dx);
  if (Math.abs(dx) < width / 4 && !flung) return index;
  const next = dx < 0 ? index + 1 : index - 1;
  return Math.min(count - 1, Math.max(0, next));
}

/** A vertical swipe closes the browser past 120px or on a fling either way. */
export function shouldClose(dy: number, vy: number): boolean {
  return Math.abs(dy) >= 120 || (Math.abs(vy) >= 800 && Math.sign(vy) === Math.sign(dy));
}
