export {
  CONTRAST,
  InvalidSeedError,
  SCHEME_VARIANTS,
  createScheme,
  effectiveSpec,
  isHexColor,
  seedArgb,
  type Platform,
  type SchemeOptions,
  type SchemeVariant,
  type SpecVersion,
} from "./color/scheme.js";
export {
  COLOR_ROLES,
  resolveExtras,
  resolveRoles,
  type ColorRole,
  type ColorRoles,
  type ExtraColorOptions,
  type ExtraRole,
} from "./color/roles.js";

export type { Bounds, Cubic, Point } from "./shape/geometry.js";
export { roundedPolygon, type CornerRounding, type Vertex } from "./shape/roundedPolygon.js";
export { normalize, rotateCubics, scaleCubics, toSvgPath } from "./shape/transform.js";
export {
  MATERIAL_SHAPES,
  isMaterialShape,
  materialShapeCubics,
  type MaterialShapeName,
} from "./shape/materialShapes.js";
export { materialShapeMask, materialShapePath } from "./shape/svg.js";
export {
  createShapeMorph,
  materialShapeOutline,
  morphOutline,
  outlinePath,
  reachOf,
  sampleOutline,
  type Outline,
} from "./shape/morph.js";

export {
  springAt,
  springEasing,
  springSettleTime,
  springState,
  type SpringSpec,
  type SpringState,
} from "./motion/spring.js";
export {
  cssCubicBezier,
  cubicBezier,
  type CubicBezier,
  type Easing,
} from "./motion/cubicBezier.js";
export {
  DURATION,
  EASING,
  MOTION_SCHEMES,
  SPRING_TOKENS,
  type DurationToken,
  type EasingToken,
  type MotionSchemeName,
  type MotionToken,
  type SpringToken,
} from "./motion/tokens.js";
export {
  animateSpring,
  type AnimateSpringOptions,
  type SpringAnimation,
} from "./motion/animateSpring.js";

export {
  AMPLITUDE_FADE_MS,
  CIRCULAR_FLAT_SIZE,
  CIRCULAR_WAVE,
  CIRCULAR_WAVY_SIZE,
  FULL_RING,
  HALF_GAUGE,
  LINEAR_INDETERMINATE_WAVELENGTH,
  LINEAR_STOP_SIZE,
  LINEAR_WAVE,
  PROGRESS_GLIDE_MS,
  WAVE_PERIOD_MS,
  circularPaths,
  linearPaths,
  waveAmplitudeFor,
  type ArcShape,
  type CircularPaths,
  type LinearPaths,
  type WaveShape,
} from "./progress/wave.js";
export {
  CIRCULAR_INDETERMINATE_CYCLE_MS,
  LINEAR_INDETERMINATE_CYCLE_MS,
  circularIndeterminateFrame,
  linearIndeterminateSegments,
  type CircularIndeterminateFrame,
} from "./progress/indeterminate.js";
export {
  LOADING_ACTIVE_SCALE,
  LOADING_CONTAINER_SIZE,
  LOADING_GLOBAL_ROTATION_MS,
  LOADING_INDICATOR_SHAPES,
  LOADING_MORPH_INTERVAL_MS,
  LOADING_MORPH_SPRING,
  createOutlineBuffer,
  determinateFrame,
  indeterminateFrame,
  type IndeterminateOptions,
  type IndicatorFrame,
} from "./progress/loadingIndicator.js";

export { CORNER, type CornerToken } from "./tokens/shape.js";
export { TYPESCALE, type TypeStyle, type TypeToken } from "./tokens/typescale.js";
export { ELEVATION, elevationShadow, type ElevationLevel } from "./tokens/elevation.js";
export { STATE_LAYER, type StateToken } from "./tokens/state.js";
export {
  colorStylesheet,
  systemStylesheet,
  type ColorStylesheetOptions,
  type SystemStylesheetOptions,
} from "./tokens/stylesheet.js";
export {
  PULL_DRAG_MULTIPLIER,
  PULL_INDICATOR_SIZE,
  PULL_THRESHOLD,
  pullArmed,
  pullFraction,
  pullIndicatorOffset,
  pullOverRotation,
} from "./progress/pullToRefresh.js";
