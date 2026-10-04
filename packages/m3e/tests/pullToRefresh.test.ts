import { expect, test } from "vite-plus/test";
import {
  PULL_INDICATOR_SIZE,
  PULL_THRESHOLD,
  pullArmed,
  pullFraction,
  pullIndicatorOffset,
  pullOverRotation,
} from "../src/progress/pullToRefresh.js";

test("the indicator travels at half the finger's speed up to the threshold", () => {
  expect(pullFraction(0)).toBe(0);
  expect(pullFraction(PULL_THRESHOLD)).toBeCloseTo(0.5);
  expect(pullFraction(PULL_THRESHOLD * 2)).toBeCloseTo(1);
  expect(pullFraction(-40)).toBe(0);
});

test("past the threshold the pull meets tension and stops at twice it", () => {
  const past = pullFraction(PULL_THRESHOLD * 3);
  expect(past).toBeGreaterThan(1);
  expect(past).toBeLessThan(1.5);
  expect(pullFraction(PULL_THRESHOLD * 100)).toBeCloseTo(2);
});

test("only a release past the threshold refreshes", () => {
  expect(pullArmed(PULL_THRESHOLD * 2)).toBe(false);
  expect(pullArmed(PULL_THRESHOLD * 2 + 1)).toBe(true);
});

test("the indicator starts hidden above the edge and turns only when overpulled", () => {
  expect(pullIndicatorOffset(0)).toBe(-PULL_INDICATOR_SIZE);
  expect(pullIndicatorOffset(1)).toBe(PULL_THRESHOLD - PULL_INDICATOR_SIZE);
  expect(pullOverRotation(0.9)).toBe(0);
  expect(pullOverRotation(1.5)).toBe(-90);
});
