import { describe, expect, it } from "vite-plus/test";
import {
  assignSlots,
  leadingRange,
  prefixOffsets,
  rowAt,
  visibleRange,
} from "../src/composables/useVirtualRange.js";

const offsets = prefixOffsets(100, () => 50);

describe("visibleRange", () => {
  it("covers the rows intersecting the viewport plus overscan", () => {
    expect(visibleRange(offsets, 500, 200, 2)).toEqual({ start: 8, end: 17 });
  });

  it("clamps at both ends", () => {
    expect(visibleRange(offsets, 0, 200, 4)).toEqual({ start: 0, end: 9 });
    expect(visibleRange(offsets, 4900, 200, 4)).toEqual({ start: 94, end: 100 });
  });

  it("finds a row by position", () => {
    expect(rowAt(offsets, 0)).toBe(0);
    expect(rowAt(offsets, 49)).toBe(0);
    expect(rowAt(offsets, 50)).toBe(1);
  });
});

describe("leadingRange", () => {
  it("extends only in the scroll direction", () => {
    const still = leadingRange(offsets, 1000, 200, 0, 0);
    const down = leadingRange(offsets, 1000, 200, 0, 300);
    const up = leadingRange(offsets, 1000, 200, 0, -300);
    expect(down.start).toBe(still.start);
    expect(down.end).toBe(still.end + 6);
    expect(up.start).toBe(still.start - 6);
    expect(up.end).toBe(still.end);
  });
});

describe("assignSlots", () => {
  it("keeps slots for rows that stay and reuses the slots of rows that left", () => {
    const first = assignSlots(new Map(), 0, 5);
    expect([...first.values()]).toEqual([0, 1, 2, 3, 4]);
    const next = assignSlots(first, 2, 7);
    expect(next.get(2)).toBe(2);
    expect(next.get(4)).toBe(4);
    expect(new Set([next.get(5), next.get(6)])).toEqual(new Set([0, 1]));
  });

  it("never hands two rows the same slot", () => {
    let slots = new Map<number, number>();
    for (const [start, end] of [
      [0, 8],
      [3, 14],
      [10, 12],
      [0, 20],
      [15, 18],
    ] as const) {
      slots = assignSlots(slots, start, end);
      const values = [...slots.values()];
      expect(new Set(values).size).toBe(values.length);
      expect(slots.size).toBe(end - start);
    }
  });

  it("grows the pool only when every slot is taken", () => {
    const grown = assignSlots(assignSlots(new Map(), 0, 3), 0, 5);
    expect(Math.max(...grown.values())).toBe(4);
  });
});
