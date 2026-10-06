/**
 * Where a released banner goes: Android's heads-up notification flies out sideways past a third of
 * its width or on a sideways fling, and slides away toward its edge - up for a banner at the top,
 * down for a snackbar at the bottom - once pushed a little that way or flicked. Anything less
 * springs back. Pure, so the thresholds are testable.
 */
export type DismissDirection = "up" | "down" | "left" | "right";

export interface DismissRelease {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  width: number;
  /** The screen edge the banner sits against; it can only leave through that one. */
  edge?: "top" | "bottom";
}

const SIDE_FRACTION = 0.35;
const SIDE_VELOCITY = 800;
const UP_DISTANCE = 24;
const UP_VELOCITY = 500;

export function dismissDirection(release: DismissRelease): DismissDirection | null {
  const { dx, dy, vx, vy, width, edge = "top" } = release;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const flung = Math.abs(vx) >= SIDE_VELOCITY && Math.sign(vx) === Math.sign(dx);
    if (Math.abs(dx) >= width * SIDE_FRACTION || flung) return dx < 0 ? "left" : "right";
    return null;
  }
  if (edge === "bottom") return dy >= UP_DISTANCE || vy >= UP_VELOCITY ? "down" : null;
  if (dy <= -UP_DISTANCE || vy <= -UP_VELOCITY) return "up";
  return null;
}
