import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3ListItem, M3SwipeAction, createM3e } from "../src/index.js";
import {
  fullSwipeArmed,
  fullSwipeThreshold,
  openOffset,
  settleSwipe,
  swipeOffset,
  type SwipeLimits,
} from "../src/utils/swipe.js";

const limits: SwipeLimits = {
  startWidth: 72,
  endWidth: 144,
  rowWidth: 400,
  fullStart: false,
  fullEnd: true,
};

describe("swipe arithmetic", () => {
  test("a side without actions does not move", () => {
    expect(swipeOffset(50, { ...limits, startWidth: 0 })).toBe(0);
  });

  test("past its actions a side without a full swipe resists the finger", () => {
    expect(swipeOffset(60, limits)).toBe(60);
    expect(swipeOffset(172, limits)).toBeCloseTo(72 + 100 ** 0.8);
  });

  test("a side with a full swipe follows the finger up to the row width", () => {
    expect(swipeOffset(-300, limits)).toBe(-300);
    expect(swipeOffset(-900, limits)).toBe(-400);
  });

  test("a full swipe arms past the larger of the actions plus 56 and half the row", () => {
    expect(fullSwipeThreshold(144, 400)).toBe(200);
    expect(fullSwipeThreshold(200, 300)).toBe(256);
    expect(fullSwipeArmed(-199, limits)).toBe(false);
    expect(fullSwipeArmed(-200, limits)).toBe(true);
    expect(fullSwipeArmed(300, limits)).toBe(false);
  });

  test("a release opens past half the actions or on an outward fling, and closes on a fling back", () => {
    expect(settleSwipe(-80, 0, limits)).toBe("end");
    expect(settleSwipe(-60, 0, limits)).toBeNull();
    expect(settleSwipe(-30, -300, limits)).toBe("end");
    expect(settleSwipe(-130, 300, limits)).toBeNull();
    expect(settleSwipe(-220, 0, limits)).toBe("full-end");
    expect(openOffset("end", limits)).toBe(-144);
    expect(openOffset("start", limits)).toBe(72);
  });
});

describe("M3ListItem swipe actions", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

  const pointer = (type: string, x: number, y = 10) =>
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
    });

  function mountRow(onArchive: () => void, onDelete: () => void) {
    const swiped = ref<"start" | "end" | null>(null);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            M3ListItem,
            {
              headline: "Order 42",
              swipeFull: "end",
              swiped: swiped.value,
              "onUpdate:swiped": (value: "start" | "end" | null) => (swiped.value = value),
            },
            {
              "swipe-end": () => [
                h(M3SwipeAction, { label: "Archive", onClick: onArchive }),
                h(M3SwipeAction, { label: "Delete", tone: "error", onClick: onDelete }),
              ],
            },
          ),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { wrapper, swiped };
  }

  test("a sideways drag past half the actions opens the end side", async () => {
    const { wrapper, swiped } = mountRow(vi.fn(), vi.fn());
    await settled();
    const row = wrapper.find(".m3-list-item__row").element as HTMLElement;
    row.setPointerCapture = () => {};
    row.dispatchEvent(pointer("pointerdown", 300));
    row.dispatchEvent(pointer("pointermove", 280));
    row.dispatchEvent(pointer("pointermove", 180));
    row.dispatchEvent(pointer("pointerup", 180));
    await nextTick();
    expect(swiped.value).toBe("end");
  });

  test("a mostly vertical drag is left to the page", async () => {
    const { wrapper, swiped } = mountRow(vi.fn(), vi.fn());
    await settled();
    const row = wrapper.find(".m3-list-item__row").element as HTMLElement;
    row.dispatchEvent(pointer("pointerdown", 300, 10));
    row.dispatchEvent(pointer("pointermove", 295, 60));
    row.dispatchEvent(pointer("pointermove", 200, 120));
    row.dispatchEvent(pointer("pointerup", 200, 120));
    await nextTick();
    expect(swiped.value).toBeNull();
  });

  test("a full swipe fires the outermost action", async () => {
    const onArchive = vi.fn();
    const onDelete = vi.fn();
    const { wrapper } = mountRow(onArchive, onDelete);
    await settled();
    const row = wrapper.find(".m3-list-item__row").element as HTMLElement;
    row.setPointerCapture = () => {};
    row.dispatchEvent(pointer("pointerdown", 380));
    row.dispatchEvent(pointer("pointermove", 360));
    row.dispatchEvent(pointer("pointermove", 60));
    row.dispatchEvent(pointer("pointerup", 60));
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(onArchive).not.toHaveBeenCalled();
  });
});
