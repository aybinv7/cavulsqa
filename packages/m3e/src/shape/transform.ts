import { boundsOf, DISTANCE_EPSILON, mapCubics, point, type Cubic } from "./geometry.js";

export function scaleCubics(cubics: readonly Cubic[], x: number, y: number): Cubic[] {
  return mapCubics(cubics, (p) => point(p.x * x, p.y * y));
}

/** Rotation about the origin, as `Matrix().rotateZ(degrees)` does before `transformed()`. */
export function rotateCubics(cubics: readonly Cubic[], degrees: number): Cubic[] {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return mapCubics(cubics, (p) => point(p.x * cos - p.y * sin, p.x * sin + p.y * cos));
}

/** `normalized()`: moved and scaled into the unit square, centred along the shorter side. */
export function normalize(cubics: readonly Cubic[]): Cubic[] {
  const [minX, minY, maxX, maxY] = boundsOf(cubics);
  const width = maxX - minX;
  const height = maxY - minY;
  const side = Math.max(width, height);
  const offsetX = (side - width) / 2 - minX;
  const offsetY = (side - height) / 2 - minY;
  return mapCubics(cubics, (p) => point((p.x + offsetX) / side, (p.y + offsetY) / side));
}

const isPoint = ([p0, c0, c1, p1]: Cubic) =>
  Math.abs(p1.x - p0.x) < DISTANCE_EPSILON &&
  Math.abs(p1.y - p0.y) < DISTANCE_EPSILON &&
  Math.abs(c0.x - p0.x) < DISTANCE_EPSILON &&
  Math.abs(c0.y - p0.y) < DISTANCE_EPSILON &&
  Math.abs(c1.x - p0.x) < DISTANCE_EPSILON &&
  Math.abs(c1.y - p0.y) < DISTANCE_EPSILON;

/** An SVG path over a `size` x `size` box. Zero-length cubics (unrounded corners) are skipped. */
export function toSvgPath(cubics: readonly Cubic[], size = 100): string {
  const f = (value: number) => Number((value * size).toFixed(2));
  const [first] = cubics;
  if (!first) return "";
  let d = `M${f(first[0].x)} ${f(first[0].y)}`;
  for (const cubic of cubics) {
    if (isPoint(cubic)) continue;
    const [, c0, c1, p1] = cubic;
    d += `C${f(c0.x)} ${f(c0.y)} ${f(c1.x)} ${f(c1.y)} ${f(p1.x)} ${f(p1.y)}`;
  }
  return `${d}Z`;
}
