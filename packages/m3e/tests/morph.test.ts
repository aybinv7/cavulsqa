import { expect, test } from "vite-plus/test";
import {
  createShapeMorph,
  materialShapeOutline,
  morphOutline,
  outlinePath,
  reachOf,
} from "../src/shape/morph.js";

test("outlines of different shapes share a point count and a start angle", () => {
  const a = materialShapeOutline("circle", 64);
  const b = materialShapeOutline("cookie9Sided", 64);
  expect(a).toHaveLength(128);
  expect(b).toHaveLength(128);
  expect(a[1]).toBeCloseTo(0.5, 1);
  expect(b[1]).toBeCloseTo(0.5, 1);
  expect(a[0]!).toBeGreaterThan(0.9);
});

test("a morph starts at one shape and ends at the other", () => {
  const from = materialShapeOutline("pill");
  const to = materialShapeOutline("sunny");
  const into = new Float32Array(from.length);
  morphOutline(from, to, 0, into).forEach((value, i) => expect(value).toBeCloseTo(from[i]!, 6));
  morphOutline(from, to, 1, into).forEach((value, i) => expect(value).toBeCloseTo(to[i]!, 6));
});

test("a circle's reach is its radius; corners reach further", () => {
  expect(reachOf(materialShapeOutline("circle"))).toBeCloseTo(0.5, 2);
  expect(reachOf(materialShapeOutline("square"))).toBeGreaterThan(0.55);
});

test("a fitted morph never leaves its box while it rotates", () => {
  const morph = createShapeMorph("square", "burst");
  expect(morph.scale).toBeLessThan(1);
  const path = morph.at(0.5, true);
  const numbers = path.match(/-?[\d.]+/g)!.map(Number);
  for (let i = 0; i < numbers.length; i += 2) {
    expect(Math.hypot(numbers[i]! - 50, numbers[i + 1]! - 50)).toBeLessThanOrEqual(50.1);
  }
});

test("outline paths are closed polylines over the 100 box", () => {
  expect(outlinePath(materialShapeOutline("oval", 8))).toMatch(
    /^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+){7}Z$/,
  );
});
