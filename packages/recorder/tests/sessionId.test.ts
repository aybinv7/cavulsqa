import { expect, test } from "vite-plus/test";
import { createSessionId, isValidSessionId } from "../src/capu/sessionId.js";

test("createSessionId follows capu_<ms>_<6 base36> and is valid", () => {
  const id = createSessionId(1_757_800_000_000);
  expect(id).toMatch(/^capu_1757800000000_[0-9a-z]{6}$/);
  expect(isValidSessionId(id)).toBe(true);
});

test("two ids created in the same millisecond differ", () => {
  const ids = new Set(Array.from({ length: 50 }, () => createSessionId(1)));
  expect(ids.size).toBeGreaterThan(1);
});

test.each([
  ["capu_1_abc123", true],
  ["  padded  ", true],
  ["a.b", true],
  ["", false],
  ["   ", false],
  ["a/b", false],
  ["a\\b", false],
  ["a..b", false],
  ["..", false],
  [".hidden", false],
  [" .hidden", false],
  ["trailing.", true],
])("isValidSessionId(%j) is %s", (input, valid) => {
  expect(isValidSessionId(input)).toBe(valid);
});
