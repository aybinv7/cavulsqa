import { expect, test } from "vite-plus/test";
import { cubicBezier } from "../src/motion/cubicBezier.js";
import { springAt, springEasing, springSettleTime, springState } from "../src/motion/spring.js";
import { EASING, MOTION_SCHEMES, SPRING_TOKENS } from "../src/motion/tokens.js";

const expressive = MOTION_SCHEMES.expressive;

function peak(spec: { dampingRatio: number; stiffness: number }) {
  let max = 0;
  for (let t = 0; t < 1; t += 0.0005) max = Math.max(max, springAt(t, spec));
  return max;
}

test("the expressive fast spatial spring overshoots by about 9.5%", () => {
  expect(peak(expressive.fastSpatial.spring)).toBeCloseTo(1.095, 2);
  expect(peak(expressive.defaultSpatial.spring)).toBeCloseTo(1.015, 2);
});

test("effects springs never overshoot", () => {
  for (const name of ["fastEffects", "defaultEffects", "slowEffects"] as const) {
    expect(peak(expressive[name].spring), name).toBeLessThanOrEqual(1 + 1e-9);
  }
});

test("every spring starts at rest at 0 and settles at 1", () => {
  for (const scheme of Object.values(MOTION_SCHEMES)) {
    for (const name of SPRING_TOKENS) {
      expect(springAt(0, scheme[name].spring)).toBe(0);
      expect(springAt(3, scheme[name].spring)).toBeCloseTo(1, 6);
    }
  }
});

test("velocity is the derivative of position, in every damping regime", () => {
  const specs = [
    { dampingRatio: 0.6, stiffness: 800 },
    { dampingRatio: 1, stiffness: 1600 },
    { dampingRatio: 1.4, stiffness: 500 },
  ];
  for (const spec of specs) {
    for (const v0 of [0, 4, -3]) {
      const h = 1e-5;
      const t = 0.05;
      const numeric = (springAt(t + h, spec, v0) - springAt(t - h, spec, v0)) / (2 * h);
      expect(springState(t, spec, v0).velocity).toBeCloseTo(numeric, 3);
      expect(springState(1e-9, spec, v0).velocity).toBeCloseTo(v0, 3);
    }
  }
});

test("settle times match the springs' analytic decay", () => {
  expect(springSettleTime(expressive.fastSpatial.spring) * 1000).toBeGreaterThan(300);
  expect(springSettleTime(expressive.fastSpatial.spring) * 1000).toBeLessThan(520);
  expect(springSettleTime(expressive.fastEffects.spring) * 1000).toBeLessThan(200);
});

test("a spring easing is a CSS linear() from 0 pinned to 1", () => {
  const easing = springEasing(expressive.fastSpatial.spring, 350, 25);
  expect(easing).toMatch(/^linear\(0, [\d., ]+, 1\)$/);
  const stops = easing.slice(7, -1).split(", ").map(Number);
  expect(stops).toHaveLength(25);
  expect(Math.max(...stops)).toBeGreaterThan(1.08);
});

test("a cubic bezier is exact at its ends and monotonic for M3 curves", () => {
  for (const curve of Object.values(EASING)) {
    const ease = cubicBezier(curve);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let last = 0;
    for (let t = 0.05; t < 1; t += 0.05) {
      const value = ease(t);
      expect(value).toBeGreaterThanOrEqual(last - 1e-9);
      last = value;
    }
  }
  expect(cubicBezier(EASING.linear)(0.37)).toBeCloseTo(0.37, 6);
  expect(cubicBezier(EASING.emphasizedDecelerate)(0.5)).toBeGreaterThan(0.85);
});
