import { springAt, type SpringSpec } from "../motion/spring.js";
import type { MaterialShapeName } from "../shape/materialShapes.js";
import { materialShapeOutline, morphOutline, reachOf, type Outline } from "../shape/morph.js";

/**
 * Material 3 Expressive's loading indicator, with `LoadingIndicator`'s own numbers:
 * - indeterminate: seven shapes in a loop, one morph every 650 ms on a spring (0.6 / 200) that
 *   settles inside the interval; each morph also turns the shape a quarter, and the whole indicator
 *   turns once every 4666 ms, linearly;
 * - determinate: circle to soft burst as progress goes 0 to 1, turning back half a turn.
 *
 * @see https://m3.material.io/components/loading-indicator/specs
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt
 */
export const LOADING_INDICATOR_SHAPES: readonly MaterialShapeName[] = [
  "softBurst",
  "cookie9Sided",
  "pentagon",
  "pill",
  "sunny",
  "cookie4Sided",
  "oval",
];

export const LOADING_MORPH_INTERVAL_MS = 650;
export const LOADING_GLOBAL_ROTATION_MS = 4666;
export const LOADING_MORPH_SPRING: Readonly<SpringSpec> = { dampingRatio: 0.6, stiffness: 200 };
export const LOADING_CONTAINER_SIZE = 48;
/** 38dp of shape in a 48dp container - `LoadingIndicatorDefaults.ActiveIndicatorScale`. */
export const LOADING_ACTIVE_SCALE = 38 / 48;

const POINTS = 144;

interface Sequence {
  outlines: Outline[];
  /** Fits the widest reach of any shape in the sequence, so rotation never clips a corner. */
  scale: number;
}

const sequences = new Map<string, Sequence>();

function sequenceOf(names: readonly MaterialShapeName[]): Sequence {
  const key = names.join(",");
  let sequence = sequences.get(key);
  if (!sequence) {
    const outlines = names.map((name) => materialShapeOutline(name, POINTS));
    sequence = { outlines, scale: 0.5 / Math.max(...outlines.map(reachOf)) };
    sequences.set(key, sequence);
  }
  return sequence;
}

export interface IndicatorFrame {
  outline: Outline;
  /** Degrees, clockwise. */
  rotation: number;
  /** Scale about the centre that keeps every shape of the sequence inside the box at any rotation. */
  scale: number;
}

export function createOutlineBuffer(): Outline {
  return new Float32Array(POINTS * 2);
}

export interface IndeterminateOptions {
  shapes?: readonly MaterialShapeName[];
  /** Reduced motion: keep the morph, which carries the meaning, and drop the rotation. */
  rotate?: boolean;
}

export function indeterminateFrame(
  elapsedMs: number,
  into: Outline,
  options: IndeterminateOptions = {},
): IndicatorFrame {
  const sequence = sequenceOf(options.shapes ?? LOADING_INDICATOR_SHAPES);
  const count = sequence.outlines.length;
  const step = Math.floor(elapsedMs / LOADING_MORPH_INTERVAL_MS);
  const local = (elapsedMs - step * LOADING_MORPH_INTERVAL_MS) / 1000;
  const spring = springAt(local, LOADING_MORPH_SPRING);
  morphOutline(
    sequence.outlines[step % count]!,
    sequence.outlines[(step + 1) % count]!,
    Math.min(1, Math.max(0, spring)),
    into,
  );
  if (options.rotate === false) return { outline: into, rotation: 0, scale: sequence.scale };
  const global = ((elapsedMs % LOADING_GLOBAL_ROTATION_MS) / LOADING_GLOBAL_ROTATION_MS) * 360;
  const rotation = (spring * 90 + 90 * (step + 1) + global) % 360;
  return { outline: into, rotation, scale: sequence.scale };
}

const DETERMINATE: readonly MaterialShapeName[] = ["circle", "softBurst"];

export function determinateFrame(progress: number, into: Outline): IndicatorFrame {
  const sequence = sequenceOf(DETERMINATE);
  const clamped = Math.min(1, Math.max(0, progress));
  morphOutline(sequence.outlines[0]!, sequence.outlines[1]!, clamped, into);
  return { outline: into, rotation: -clamped * 180, scale: sequence.scale };
}
