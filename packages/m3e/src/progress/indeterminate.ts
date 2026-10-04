import { cubicBezier } from "../motion/cubicBezier.js";
import { EASING } from "../motion/tokens.js";

/**
 * Indeterminate progress timings from Compose's `ProgressIndicator.kt`, as functions of elapsed
 * time, so one animation frame can draw every indicator on screen without per-indicator timers.
 *
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ProgressIndicator.kt
 */
export const LINEAR_INDETERMINATE_CYCLE_MS = 1750;
export const CIRCULAR_INDETERMINATE_CYCLE_MS = 6000;

const accelerate = cubicBezier(EASING.emphasizedAccelerate);
const decelerate = cubicBezier(EASING.emphasizedDecelerate);
const standard = cubicBezier(EASING.standard);

function phase(time: number, delay: number, duration: number): number {
  if (time <= delay) return 0;
  if (time >= delay + duration) return 1;
  return accelerate((time - delay) / duration);
}

/** The two moving lines of an indeterminate linear indicator, as `[tail, head]` fractions. */
export function linearIndeterminateSegments(
  elapsedMs: number,
): [readonly [number, number], readonly [number, number]] {
  const t =
    ((elapsedMs % LINEAR_INDETERMINATE_CYCLE_MS) + LINEAR_INDETERMINATE_CYCLE_MS) %
    LINEAR_INDETERMINATE_CYCLE_MS;
  return [
    [phase(t, 250, 1000), phase(t, 0, 1000)],
    [phase(t, 900, 850), phase(t, 650, 850)],
  ];
}

const MIN_SWEEP = 0.1;
const MAX_SWEEP = 0.87;
const GLOBAL_TURN_DEGREES = 1080;
const STEP_DELAY = 1500;
const STEP_DURATION = 300;

export interface CircularIndeterminateFrame {
  /** Fraction of the ring the active arc covers. */
  sweep: number;
  /** Degrees, clockwise, of the arc's tail from 12 o'clock. */
  rotation: number;
}

/**
 * The arc grows from 10% to 87% of the ring over half a cycle and shrinks back, while the ring
 * turns three times per cycle and steps a further quarter turn every 1.5 s. Compose writes the
 * quarter steps with its `using` easing attached to the hold keyframe, which leaves them linear;
 * they are eased here with emphasized-decelerate, the curve the source names for them.
 */
export function circularIndeterminateFrame(elapsedMs: number): CircularIndeterminateFrame {
  const cycle = CIRCULAR_INDETERMINATE_CYCLE_MS;
  const t = ((elapsedMs % cycle) + cycle) % cycle;
  const half = cycle / 2;
  const sweep =
    t < half
      ? MIN_SWEEP + (MAX_SWEEP - MIN_SWEEP) * (t / half)
      : MAX_SWEEP - (MAX_SWEEP - MIN_SWEEP) * standard((t - half) / half);

  const step = Math.floor(t / STEP_DELAY);
  const within = t - step * STEP_DELAY;
  const stepProgress = within >= STEP_DURATION ? 1 : decelerate(within / STEP_DURATION);
  const additional = 90 * step + 90 * stepProgress;
  const global = (t / cycle) * GLOBAL_TURN_DEGREES;
  return { sweep, rotation: (global + additional) % 360 };
}
