import { test, expect } from "vite-plus/test";
import { createVisibilityGate } from "../src/visibilityGate.js";

test("a change while visible refetches immediately", () => {
  const gate = createVisibilityGate();
  expect(gate.recordChange(true)).toBe("refetch");
});

test("a change while hidden defers instead of refetching", () => {
  const gate = createVisibilityGate();
  expect(gate.recordChange(false)).toBe("defer");
});

test("becoming visible after a deferred change refetches once", () => {
  const gate = createVisibilityGate();
  gate.recordChange(false);
  expect(gate.recordVisible()).toBe("refetch");
});

test("becoming visible with no deferred change stays idle", () => {
  const gate = createVisibilityGate();
  expect(gate.recordVisible()).toBe("idle");
});

test("multiple deferred changes collapse into a single refetch on show", () => {
  const gate = createVisibilityGate();
  gate.recordChange(false);
  gate.recordChange(false);
  gate.recordChange(false);
  expect(gate.recordVisible()).toBe("refetch");
  expect(gate.recordVisible()).toBe("idle");
});
