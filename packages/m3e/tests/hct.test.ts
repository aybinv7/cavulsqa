import { describe, expect, test } from "vite-plus/test";
import { expandHex, hctToHex, hexToHct, maxChroma } from "../src/index.js";

describe("HCT helpers", () => {
  test("a hex colour survives the round trip through HCT", () => {
    for (const hex of ["#6750a4", "#b3261e", "#006a6a", "#ffffff", "#000000"]) {
      expect(hctToHex(hexToHct(hex))).toBe(hex);
    }
  });

  test("tone runs from black to white and hue wraps around", () => {
    expect(hctToHex({ hue: 120, chroma: 40, tone: 0 })).toBe("#000000");
    expect(hctToHex({ hue: 120, chroma: 40, tone: 100 })).toBe("#ffffff");
    expect(hctToHex({ hue: 400, chroma: 40, tone: 50 })).toBe(
      hctToHex({ hue: 40, chroma: 40, tone: 50 }),
    );
  });

  test("too much chroma gives the most a hue and tone can show, keeping the tone", () => {
    const limit = maxChroma(265, 40);
    expect(limit).toBeGreaterThan(30);
    const asked = hexToHct(hctToHex({ hue: 265, chroma: 180, tone: 40 }));
    expect(asked.chroma).toBeLessThanOrEqual(limit + 1);
    expect(asked.tone).toBeCloseTo(40, 0);
  });

  test("short and bare hex expand; anything else throws", () => {
    expect(expandHex("#ABC")).toBe("#aabbcc");
    expect(expandHex("6750A4")).toBe("#6750a4");
    expect(() => expandHex("#12")).toThrow(TypeError);
    expect(() => expandHex("red")).toThrow(TypeError);
  });
});
