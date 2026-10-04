import { point, type Cubic } from "./geometry.js";
import {
  circleVertices,
  rectangleVertices,
  regularVertices,
  repeatVertices,
  roundedPolygon,
  starVertices,
  type CornerRounding,
  type Vertex,
} from "./roundedPolygon.js";
import { normalize, rotateCubics, scaleCubics } from "./transform.js";

/**
 * The 35 shapes of Material 3 Expressive, built exactly as `androidx.compose.material3.MaterialShapes`
 * builds them: same vertices, same per-corner rounding, same transforms, same normalisation into
 * the unit square. Numbers are copied from that source, never eyeballed.
 *
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt
 * @see https://m3.material.io/styles/shape/overview-principles
 */
const r = (radius: number, smoothing?: number): CornerRounding => ({ radius, smoothing });
const R15 = r(0.15);
const R20 = r(0.2);
const R30 = r(0.3);
const R50 = r(0.5);
const R100 = r(1);

const at = (x: number, y: number, radius?: number, smoothing?: number): Vertex => ({
  at: point(x, y),
  rounding: radius === undefined ? undefined : r(radius, smoothing),
});

const custom = (points: readonly Vertex[], reps: number, mirroring = false): Cubic[] =>
  roundedPolygon(repeatVertices(points, reps, mirroring));

const DEFINITIONS = {
  circle: () => roundedPolygon(circleVertices(10)),
  square: () => roundedPolygon(rectangleVertices(1, 1, R30)),
  slanted: () => custom([at(0.926, 0.97, 0.189, 0.811), at(-0.021, 0.967, 0.187, 0.057)], 2),
  arch: () => rotateCubics(roundedPolygon(regularVertices(4, 1, [R100, R100, R20, R20])), -135),
  fan: () =>
    custom(
      [at(1.004, 1, 0.148, 0.417), at(0, 1, 0.151), at(0, -0.003, 0.148), at(0.978, 0.02, 0.803)],
      1,
    ),
  arrow: () =>
    custom(
      [
        at(0.5, 0.892, 0.313),
        at(-0.216, 1.05, 0.207),
        at(0.499, -0.16, 0.215, 1),
        at(1.225, 1.06, 0.211),
      ],
      1,
    ),
  semiCircle: () => roundedPolygon(rectangleVertices(1.6, 1, [R20, R20, R100, R100])),
  oval: () => rotateCubics(scaleCubics(roundedPolygon(circleVertices()), 1, 0.64), -45),
  pill: () => custom([at(0.961, 0.039, 0.426), at(1.001, 0.428), at(1, 0.609, 1)], 2, true),
  triangle: () => rotateCubics(roundedPolygon(regularVertices(3, 1, R20)), -90),
  diamond: () => custom([at(0.5, 1.096, 0.151, 0.524), at(0.04, 0.5, 0.159)], 2),
  clamShell: () =>
    custom([at(0.171, 0.841, 0.159), at(-0.02, 0.5, 0.14), at(0.17, 0.159, 0.159)], 2),
  pentagon: () =>
    custom([at(0.5, -0.009, 0.172), at(1.03, 0.365, 0.164), at(0.828, 0.97, 0.169)], 1, true),
  gem: () =>
    custom(
      [
        at(0.499, 1.023, 0.241, 0.778),
        at(-0.005, 0.792, 0.208),
        at(0.073, 0.258, 0.228),
        at(0.433, 0, 0.491),
      ],
      1,
      true,
    ),
  sunny: () => roundedPolygon(starVertices(8, 0.8, R15)),
  verySunny: () => custom([at(0.5, 1.08, 0.085), at(0.358, 0.843, 0.085)], 8),
  cookie4Sided: () => custom([at(1.237, 1.236, 0.258), at(0.5, 0.918, 0.233)], 4),
  cookie6Sided: () => custom([at(0.723, 0.884, 0.394), at(0.5, 1.099, 0.398)], 6),
  cookie7Sided: () => rotateCubics(roundedPolygon(starVertices(7, 0.75, R50)), -90),
  cookie9Sided: () => rotateCubics(roundedPolygon(starVertices(9, 0.8, R50)), -90),
  cookie12Sided: () => rotateCubics(roundedPolygon(starVertices(12, 0.8, R50)), -90),
  ghostish: () =>
    custom(
      [at(0.5, 0, 1), at(1, 0, 1), at(1, 1.14, 0.254, 0.106), at(0.575, 0.906, 0.253)],
      1,
      true,
    ),
  clover4Leaf: () => custom([at(0.5, 0.074), at(0.725, -0.099, 0.476)], 4, true),
  clover8Leaf: () => custom([at(0.5, 0.036), at(0.758, -0.101, 0.209)], 8),
  burst: () => custom([at(0.5, -0.006, 0.006), at(0.592, 0.158, 0.006)], 12),
  softBurst: () => custom([at(0.193, 0.277, 0.053), at(0.176, 0.055, 0.053)], 10),
  boom: () => custom([at(0.457, 0.296, 0.007), at(0.5, -0.051, 0.007)], 15),
  softBoom: () =>
    custom(
      [
        at(0.733, 0.454),
        at(0.839, 0.437, 0.532),
        at(0.949, 0.449, 0.439, 1),
        at(0.998, 0.478, 0.174),
      ],
      16,
      true,
    ),
  flower: () =>
    custom([at(0.37, 0.187), at(0.416, 0.049, 0.381), at(0.479, 0.001, 0.095)], 8, true),
  puffy: () =>
    scaleCubics(
      custom(
        [
          at(0.5, 0.053),
          at(0.545, -0.04, 0.405),
          at(0.67, -0.035, 0.426),
          at(0.717, 0.066, 0.574),
          at(0.722, 0.128),
          at(0.777, 0.002, 0.36),
          at(0.914, 0.149, 0.66),
          at(0.926, 0.289, 0.66),
          at(0.881, 0.346),
          at(0.94, 0.344, 0.126),
          at(1.003, 0.437, 0.255),
        ],
        2,
        true,
      ),
      1,
      0.742,
    ),
  puffyDiamond: () =>
    custom([at(0.87, 0.13, 0.146), at(0.818, 0.357), at(1, 0.332, 0.853)], 4, true),
  pixelCircle: () =>
    custom(
      [
        at(0.5, 0),
        at(0.704, 0),
        at(0.704, 0.065),
        at(0.843, 0.065),
        at(0.843, 0.148),
        at(0.926, 0.148),
        at(0.926, 0.296),
        at(1, 0.296),
      ],
      2,
      true,
    ),
  pixelTriangle: () =>
    custom(
      [
        at(0.11, 0.5),
        at(0.113, 0),
        at(0.287, 0),
        at(0.287, 0.087),
        at(0.421, 0.087),
        at(0.421, 0.17),
        at(0.56, 0.17),
        at(0.56, 0.265),
        at(0.674, 0.265),
        at(0.675, 0.344),
        at(0.789, 0.344),
        at(0.789, 0.439),
        at(0.888, 0.439),
      ],
      1,
      true,
    ),
  bun: () =>
    custom([at(0.796, 0.5), at(0.853, 0.518, 1), at(0.992, 0.631, 1), at(0.968, 1, 1)], 2, true),
  heart: () =>
    custom(
      [
        at(0.5, 0.268, 0.016),
        at(0.792, -0.066, 0.958),
        at(1.064, 0.276, 1),
        at(0.501, 0.946, 0.129),
      ],
      1,
      true,
    ),
} satisfies Record<string, () => Cubic[]>;

export type MaterialShapeName = keyof typeof DEFINITIONS;

export const MATERIAL_SHAPES = Object.freeze(
  Object.keys(DEFINITIONS),
) as readonly MaterialShapeName[];

const cubicsCache = new Map<MaterialShapeName, readonly Cubic[]>();

export function isMaterialShape(name: string): name is MaterialShapeName {
  return Object.hasOwn(DEFINITIONS, name);
}

/** A shape's outline normalised into the unit square, built once per shape. */
export function materialShapeCubics(name: MaterialShapeName): readonly Cubic[] {
  let cubics = cubicsCache.get(name);
  if (!cubics) {
    const build = DEFINITIONS[name];
    if (!build) throw new Error(`unknown Material shape "${name}"`);
    cubics = Object.freeze(normalize(build()));
    cubicsCache.set(name, cubics);
  }
  return cubics;
}
