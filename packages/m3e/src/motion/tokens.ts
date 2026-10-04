import type { CubicBezier } from "./cubicBezier.js";
import type { SpringSpec } from "./spring.js";

/**
 * Material 3 Expressive's motion physics. Spatial springs move position, size, rotation and shape,
 * and may bounce; effects springs change colour and opacity, and never overshoot. Fast is for small
 * components, default for partial-screen surfaces (sheets, drawers), slow for full-screen moves.
 *
 * @see https://m3.material.io/styles/motion/overview/how-it-works
 * @see https://m3.material.io/styles/motion/overview/specs
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt
 */
export type MotionSchemeName = "expressive" | "standard";
export type SpringToken =
  | "fastSpatial"
  | "defaultSpatial"
  | "slowSpatial"
  | "fastEffects"
  | "defaultEffects"
  | "slowEffects";

export interface MotionToken {
  spring: SpringSpec;
  /** The official web duration for the token's curve, from the motion specs page. */
  durationMs: number;
  /** The official web cubic-bezier: exact for effects, an approximation for spatial springs. */
  bezier: CubicBezier;
}

const EFFECTS = {
  fastEffects: {
    spring: { dampingRatio: 1, stiffness: 3800 },
    durationMs: 150,
    bezier: [0.31, 0.94, 0.34, 1],
  },
  defaultEffects: {
    spring: { dampingRatio: 1, stiffness: 1600 },
    durationMs: 200,
    bezier: [0.34, 0.8, 0.34, 1],
  },
  slowEffects: {
    spring: { dampingRatio: 1, stiffness: 800 },
    durationMs: 300,
    bezier: [0.34, 0.88, 0.34, 1],
  },
} as const satisfies Record<string, MotionToken>;

export const MOTION_SCHEMES: Readonly<
  Record<MotionSchemeName, Readonly<Record<SpringToken, MotionToken>>>
> = {
  expressive: {
    fastSpatial: {
      spring: { dampingRatio: 0.6, stiffness: 800 },
      durationMs: 350,
      bezier: [0.42, 1.67, 0.21, 0.9],
    },
    defaultSpatial: {
      spring: { dampingRatio: 0.8, stiffness: 380 },
      durationMs: 500,
      bezier: [0.38, 1.21, 0.22, 1],
    },
    slowSpatial: {
      spring: { dampingRatio: 0.8, stiffness: 200 },
      durationMs: 650,
      bezier: [0.39, 1.29, 0.35, 0.98],
    },
    ...EFFECTS,
  },
  standard: {
    fastSpatial: {
      spring: { dampingRatio: 0.9, stiffness: 1400 },
      durationMs: 350,
      bezier: [0.27, 1.06, 0.18, 1],
    },
    defaultSpatial: {
      spring: { dampingRatio: 0.9, stiffness: 700 },
      durationMs: 500,
      bezier: [0.27, 1.06, 0.18, 1],
    },
    slowSpatial: {
      spring: { dampingRatio: 0.9, stiffness: 300 },
      durationMs: 750,
      bezier: [0.27, 1.06, 0.18, 1],
    },
    ...EFFECTS,
  },
};

export const SPRING_TOKENS = Object.keys(MOTION_SCHEMES.expressive) as readonly SpringToken[];

/**
 * The easing-and-duration system M3 now calls legacy. Still the right tool for transitions that
 * are not physical moves, and what Compose uses inside its progress indicators.
 *
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt
 */
export const EASING = {
  emphasized: [0.2, 0, 0, 1],
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1],
  emphasizedAccelerate: [0.3, 0, 0.8, 0.15],
  standard: [0.2, 0, 0, 1],
  standardDecelerate: [0, 0, 0, 1],
  standardAccelerate: [0.3, 0, 1, 1],
  legacy: [0.4, 0, 0.2, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, CubicBezier>;

export type EasingToken = keyof typeof EASING;

export const DURATION = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
  long3: 550,
  long4: 600,
  extraLong1: 700,
  extraLong2: 800,
  extraLong3: 900,
  extraLong4: 1000,
} as const;

export type DurationToken = keyof typeof DURATION;
