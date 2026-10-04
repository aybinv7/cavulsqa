import { describe, expect, test } from "vite-plus/test";
import {
  heroKeylines,
  multiBrowseKeylines,
  uncontainedKeylines,
} from "../src/utils/carousel/arrangement.js";
import {
  createStrategy,
  keylinesForScrollOffset,
  maxScrollOffset,
  placeItem,
  snapScrollOffset,
} from "../src/utils/carousel/strategy.js";

const round = (values: number[]) => values.map((value) => Math.round(value * 100) / 100);

describe("multi-browse keylines on a 412dp phone", () => {
  const list = multiBrowseKeylines(412, 186, 8, 10);

  test("two large items and a small one, between 10dp anchors", () => {
    expect(round(list.keylines.map((k) => k.size))).toEqual([10, 178, 178, 40, 10]);
    expect(round(list.keylines.map((k) => k.offset))).toEqual([-13, 89, 275, 392, 425]);
    expect(round(list.keylines.map((k) => k.unadjustedOffset))).toEqual([-97, 89, 275, 461, 647]);
    expect([list.firstFocalIndex, list.lastFocalIndex]).toEqual([1, 2]);
  });

  test("the end step moves the small item ahead of the focal range", () => {
    const strategy = createStrategy(list, 412, 8);
    const end = strategy.endSteps.at(-1)!;
    expect(round(end.keylines.map((k) => k.size))).toEqual([10, 40, 178, 178, 10]);
    expect(end.pivotIndex).toBe(2);
    expect(end.keylines[2]!.offset).toBe(137);
    expect(strategy.endShiftDistance).toBe(138);
  });

  test("fewer items than keylines drops the small one", () => {
    const two = multiBrowseKeylines(412, 186, 8, 2);
    expect(two.keylines.filter((k) => !k.isAnchor)).toHaveLength(2);
  });
});

describe("carousel scrolling", () => {
  const count = 8;
  const strategy = createStrategy(multiBrowseKeylines(412, 186, 8, count), 412, 8);
  const max = maxScrollOffset(strategy, count);

  test("at rest the first item fills the first focal keyline", () => {
    const keylines = keylinesForScrollOffset(strategy, 0, max);
    const first = placeItem(strategy, keylines, 0, 0);
    expect(first).toEqual({ center: 89, size: 178 });
    expect(placeItem(strategy, keylines, 2, 0).size).toBeCloseTo(40);
  });

  test("scrolled to the end, the last item fills the last focal keyline", () => {
    const keylines = keylinesForScrollOffset(strategy, max, max);
    const last = placeItem(strategy, keylines, count - 1, max);
    expect(last.size).toBeCloseTo(178);
    expect(last.center).toBeCloseTo(412 - 89);
  });

  test("every item has a snap position inside the scroll range, first at 0 and last at the end", () => {
    const snaps = Array.from({ length: count }, (_, index) =>
      snapScrollOffset(strategy, index, count),
    );
    expect(snaps[0]).toBe(0);
    expect(snaps.at(-1)).toBe(max);
    expect(snaps.every((snap, index) => index === 0 || snap >= snaps[index - 1]!)).toBe(true);
  });
});

describe("uncontained and hero keylines", () => {
  test("uncontained keeps full-size items and compresses the one at the edge", () => {
    const list = uncontainedKeylines(412, 186, 8);
    const sizes = list.keylines.filter((k) => !k.isAnchor).map((k) => k.size);
    expect(sizes.slice(0, 2)).toEqual([194, 194]);
    expect(sizes[2]).toBeLessThan(194);
  });

  test("the centred hero puts one large item between two small ones", () => {
    const list = heroKeylines(412, undefined, 8, 6, true);
    const sizes = round(list.keylines.filter((k) => !k.isAnchor).map((k) => k.size));
    expect(sizes).toEqual([40, 316, 40]);
    const large = list.keylines[list.firstFocalIndex]!;
    expect(large.offset).toBeCloseTo(206);
  });
});

describe("carousel release", async () => {
  const { settleCarousel } = await import("../src/utils/carousel/settle.js");
  const { flingDistance } = await import("../src/utils/fling.js");
  const snaps = [0, 186, 372, 558, 744];
  const base = { snaps, startIndex: 1, itemSize: 178, maxScroll: 744 };

  test("Android's spline decay: faster flings travel further, symmetrically", () => {
    expect(flingDistance(2000)).toBeGreaterThan(600);
    expect(flingDistance(2000)).toBeLessThan(700);
    expect(flingDistance(-2000)).toBeCloseTo(-flingDistance(2000));
    expect(flingDistance(4000)).toBeGreaterThan(flingDistance(2000) * 2);
  });

  test("a slow release goes to the nearest item, or on after 56dp", () => {
    const at = (scroll: number) =>
      settleCarousel({ ...base, scroll, velocity: 0, fling: "multi" }).index;
    expect(at(220)).toBe(1);
    expect(at(242)).toBe(2);
    expect(at(130)).toBe(0);
  });

  test("a multi-browse fling carries past several items; single advance moves one", () => {
    const multi = settleCarousel({ ...base, scroll: 200, velocity: 3000, fling: "multi" });
    expect(multi.index).toBeGreaterThanOrEqual(3);
    const single = settleCarousel({ ...base, scroll: 200, velocity: 3000, fling: "single" });
    expect(single.index).toBe(2);
    const back = settleCarousel({ ...base, scroll: 180, velocity: -3000, fling: "single" });
    expect(back.index).toBe(0);
  });

  test("uncontained coasts to wherever the decay stops, inside the range", () => {
    const coast = settleCarousel({ ...base, scroll: 100, velocity: 1000, fling: "none" });
    expect(coast.offset).toBeCloseTo(100 + flingDistance(1000));
    expect(settleCarousel({ ...base, scroll: 700, velocity: 5000, fling: "none" }).offset).toBe(
      744,
    );
  });
});
