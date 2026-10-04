/**
 * How far a fling travels before it stops, from Android's `SplineBasedDecay` (the
 * `FlingCalculator` behind every Compose scroller), in px per second and px - CSS px stand in for dp.
 * Snapping scrollers project the release with it and pick the snap point nearest the landing.
 */
const INFLEXION = 0.35;
const FRICTION = 0.015;
const DECELERATION_RATE = Math.log(0.78) / Math.log(0.9);
const PHYSICAL_COEFFICIENT = 9.80665 * 39.37 * 160 * 0.84;

export function flingDistance(velocity: number): number {
  if (velocity === 0) return 0;
  const reach = FRICTION * PHYSICAL_COEFFICIENT;
  const l = Math.log((INFLEXION * Math.abs(velocity)) / reach);
  return Math.sign(velocity) * reach * Math.exp((DECELERATION_RATE / (DECELERATION_RATE - 1)) * l);
}

/** Compose's `MinFlingVelocityDp`: slower releases settle by position, not by fling. */
export const MIN_FLING_VELOCITY = 400;
