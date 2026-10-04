import { expect, test } from "vite-plus/test";
import {
  MATERIAL_SHAPES,
  isMaterialShape,
  materialShapeCubics,
  type MaterialShapeName,
} from "../src/shape/materialShapes.js";
import { materialShapeMask, materialShapePath } from "../src/shape/svg.js";
import { boundsOf, bezierAt } from "../src/shape/geometry.js";

test("the library has the 35 shapes of Material 3 Expressive", () => {
  expect(MATERIAL_SHAPES).toHaveLength(35);
  expect(new Set(MATERIAL_SHAPES).size).toBe(35);
});

test("every shape is a closed outline normalised into the unit square", () => {
  for (const name of MATERIAL_SHAPES) {
    const cubics = materialShapeCubics(name);
    const points = cubics.flatMap(([p0, c0, c1, p1]) =>
      Array.from({ length: 9 }, (_, i) => [
        bezierAt(p0.x, c0.x, c1.x, p1.x, i / 8),
        bezierAt(p0.y, c0.y, c1.y, p1.y, i / 8),
      ]),
    );
    expect(points.flat().every(Number.isFinite), name).toBe(true);

    const [minX, minY, maxX, maxY] = boundsOf(cubics);
    expect(Math.min(minX, minY), name).toBeGreaterThanOrEqual(-1e-6);
    expect(Math.max(maxX, maxY), name).toBeLessThanOrEqual(1 + 1e-6);
    expect(Math.max(maxX - minX, maxY - minY), name).toBeCloseTo(1, 5);

    const first = cubics[0]![0];
    const last = cubics.at(-1)![3];
    expect(Math.hypot(first.x - last.x, first.y - last.y), name).toBeLessThan(1e-6);
  }
});

test("each path is valid SVG path data", () => {
  for (const name of MATERIAL_SHAPES) {
    expect(materialShapePath(name), name).toMatch(/^M-?[\d.]+ -?[\d.]+(C[-\d. ]+)+Z$/);
  }
});

test("a rounded star keeps one arc per vertex once zero-length pieces are dropped", () => {
  const curves = (name: MaterialShapeName) => (materialShapePath(name).match(/C/g) ?? []).length;
  expect(curves("cookie12Sided")).toBe(24);
  expect(curves("cookie9Sided")).toBe(18);
});

test("the pixel shapes stay unrounded staircases", () => {
  const path = materialShapePath("pixelCircle");
  expect((path.match(/C/g) ?? []).length).toBeGreaterThanOrEqual(28);
});

test("shapes and masks are built once and reused", () => {
  expect(materialShapeCubics("heart")).toBe(materialShapeCubics("heart"));
  const mask = materialShapeMask("pentagon");
  expect(mask.startsWith('url("data:image/svg+xml,')).toBe(true);
  expect(materialShapeMask("pentagon")).toBe(mask);
  expect(decodeURIComponent(mask)).toContain(materialShapePath("pentagon"));
});

test("names are checked at runtime as well as by type", () => {
  expect(isMaterialShape("sunny")).toBe(true);
  expect(isMaterialShape("toString")).toBe(false);
  expect(() => materialShapeCubics("nope" as MaterialShapeName)).toThrow(/unknown Material shape/);
});
