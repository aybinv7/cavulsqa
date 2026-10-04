import { describe, expect, test } from "vite-plus/test";
import { detentAnchors, offsetOf, settleDetent } from "../src/utils/detents.js";

const layout = { sheetHeight: 800, available: 800, peekVisible: 56, half: true, hideable: false };
const anchors = detentAnchors(layout);

describe("standard sheet anchors", () => {
  test("a full-height sheet rests expanded, at half and peeking", () => {
    expect(anchors).toEqual([
      { detent: "expanded", offset: 0 },
      { detent: "half", offset: 400 },
      { detent: "peek", offset: 744 },
    ]);
  });

  test("a hideable sheet adds the hidden anchor below the peek", () => {
    expect(detentAnchors({ ...layout, hideable: true }).at(-1)).toEqual({
      detent: "hidden",
      offset: 800,
    });
  });

  test("a sheet shorter than half the space has no half detent", () => {
    const short = detentAnchors({ ...layout, sheetHeight: 300 });
    expect(short.map((anchor) => anchor.detent)).toEqual(["expanded", "peek"]);
    expect(offsetOf("half", short)).toEqual({ detent: "expanded", offset: 0 });
  });

  test("a hidden request on a sheet that cannot hide rests at the peek", () => {
    expect(offsetOf("hidden", anchors).detent).toBe("peek");
  });
});

describe("standard sheet settle", () => {
  test("a fling goes to the next anchor in its direction", () => {
    expect(settleDetent(700, -400, anchors, 744).detent).toBe("half");
    expect(settleDetent(420, 400, anchors, 400).detent).toBe("peek");
  });

  test("a slow drag moves on only after 56px", () => {
    expect(settleDetent(700, -20, anchors, 744).detent).toBe("peek");
    expect(settleDetent(680, -20, anchors, 744).detent).toBe("half");
    expect(settleDetent(450, 0, anchors, 400).detent).toBe("half");
    expect(settleDetent(460, 0, anchors, 400).detent).toBe("peek");
  });

  test("a finger that stops still keeps the drag's direction", () => {
    expect(settleDetent(330, 0, anchors, 400).detent).toBe("expanded");
  });

  test("past either end it rests on that end", () => {
    expect(settleDetent(-10, -900, anchors, 400).detent).toBe("expanded");
    expect(settleDetent(800, 900, anchors, 400).detent).toBe("peek");
  });
});
