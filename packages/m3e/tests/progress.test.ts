import { expect, test } from "vite-plus/test";
import {
  CIRCULAR_WAVE,
  HALF_GAUGE,
  LINEAR_WAVE,
  circularPaths,
  linearPaths,
  waveAmplitudeFor,
} from "../src/progress/wave.js";
import {
  CIRCULAR_INDETERMINATE_CYCLE_MS,
  LINEAR_INDETERMINATE_CYCLE_MS,
  circularIndeterminateFrame,
  linearIndeterminateSegments,
} from "../src/progress/indeterminate.js";
import {
  LOADING_MORPH_INTERVAL_MS,
  createOutlineBuffer,
  determinateFrame,
  indeterminateFrame,
} from "../src/progress/loadingIndicator.js";

test("the wave shows only between 10% and 95%", () => {
  expect(waveAmplitudeFor(0.1)).toBe(0);
  expect(waveAmplitudeFor(0.5)).toBe(1);
  expect(waveAmplitudeFor(0.95)).toBe(0);
});

test("an empty linear bar is all track with a stop dot", () => {
  const paths = linearPaths(240, [[0, 0]], LINEAR_WAVE, 1, 0);
  expect(paths.active).toBe("");
  expect(paths.track).toBe("M2.00 5.00L238.00 5.00");
  expect(paths.stop).toEqual({ x: 238, y: 5 });
  expect(paths.height).toBe(10);
});

test("a full linear bar has no track and no stop", () => {
  const paths = linearPaths(240, [[0, 1]], LINEAR_WAVE, 0, 0);
  expect(paths.track).toBe("");
  expect(paths.stop).toBeNull();
});

test("the track leaves a gap after the indicator", () => {
  const paths = linearPaths(240, [[0, 0.5]], LINEAR_WAVE, 0, 0);
  const activeEnd = Number(/L([\d.]+) [\d.]+$/.exec(paths.active)![1]);
  const trackStart = Number(/^M([\d.]+)/.exec(paths.track)![1]);
  expect(trackStart - activeEnd).toBeCloseTo(LINEAR_WAVE.gap + LINEAR_WAVE.thickness, 1);
});

test("indeterminate linear segments stay in range and loop", () => {
  for (let t = 0; t < LINEAR_INDETERMINATE_CYCLE_MS; t += 25) {
    for (const [tail, head] of linearIndeterminateSegments(t)) {
      expect(tail).toBeGreaterThanOrEqual(0);
      expect(head).toBeLessThanOrEqual(1);
      expect(head).toBeGreaterThanOrEqual(tail);
    }
  }
  expect(linearIndeterminateSegments(LINEAR_INDETERMINATE_CYCLE_MS)).toEqual(
    linearIndeterminateSegments(0),
  );
  const paths = linearPaths(240, linearIndeterminateSegments(700), LINEAR_WAVE, 1, 0, false);
  expect(paths.active.match(/M/g)).toHaveLength(2);
  expect(paths.stop).toBeNull();
});

test("indeterminate circular frames sweep between 10% and 87% and loop seamlessly", () => {
  for (let t = 0; t < CIRCULAR_INDETERMINATE_CYCLE_MS; t += 50) {
    const { sweep, rotation } = circularIndeterminateFrame(t);
    expect(sweep).toBeGreaterThanOrEqual(0.1 - 1e-9);
    expect(sweep).toBeLessThanOrEqual(0.87 + 1e-9);
    expect(rotation).toBeGreaterThanOrEqual(0);
    expect(rotation).toBeLessThan(360);
  }
  const end = circularIndeterminateFrame(CIRCULAR_INDETERMINATE_CYCLE_MS - 1e-6);
  expect(end.sweep).toBeCloseTo(0.1, 3);
  expect(Math.min(end.rotation, 360 - end.rotation)).toBeCloseTo(0, 0);
});

test("circular paths draw a ring track when empty and a gauge only over its arc", () => {
  expect(circularPaths(48, 0, 0, CIRCULAR_WAVE, 1, 0).track).toMatch(/^M24\.00 /);
  const gauge = circularPaths(96, 0, 0.5, CIRCULAR_WAVE, 1, 0, HALF_GAUGE);
  expect(gauge.active.startsWith("M")).toBe(true);
  expect(gauge.track).toMatch(/A[\d. ]+ 0 0 1 /);
});

test("the loading indicator morphs continuously across a step", () => {
  const buffer = createOutlineBuffer();
  const before = indeterminateFrame(LOADING_MORPH_INTERVAL_MS - 0.01, buffer);
  const beforeOutline = Array.from(before.outline);
  const beforeRotation = before.rotation;
  const after = indeterminateFrame(LOADING_MORPH_INTERVAL_MS, buffer);
  expect(Math.abs(after.rotation - beforeRotation)).toBeLessThan(3);
  const drift = beforeOutline.reduce(
    (max, value, i) => Math.max(max, Math.abs(value - after.outline[i]!)),
    0,
  );
  expect(drift).toBeLessThan(0.02);
});

test("reduced motion keeps the morph and drops the rotation", () => {
  const frame = indeterminateFrame(1234, createOutlineBuffer(), { rotate: false });
  expect(frame.rotation).toBe(0);
});

test("determinate progress turns back half a turn as it fills", () => {
  expect(determinateFrame(0, createOutlineBuffer()).rotation === 0).toBe(true);
  expect(determinateFrame(1, createOutlineBuffer()).rotation).toBe(-180);
  expect(determinateFrame(2, createOutlineBuffer()).rotation).toBe(-180);
});
