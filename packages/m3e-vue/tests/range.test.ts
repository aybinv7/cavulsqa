import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3RangeSlider, createM3e } from "../src/index.js";
import { moveThumb, nearestThumb, snapValue } from "../src/utils/range.js";

const bounds = { min: 0, max: 100, step: 5, minDistance: 10 };

describe("range arithmetic", () => {
  test("a press moves the nearer handle, and a tie splits by side", () => {
    expect(nearestThumb(20, 30, 70)).toBe("start");
    expect(nearestThumb(60, 30, 70)).toBe("end");
    expect(nearestThumb(40, 50, 50)).toBe("start");
    expect(nearestThumb(60, 50, 50)).toBe("end");
  });

  test("values snap to the step and stay in bounds", () => {
    expect(snapValue(42, 0, 100, 5)).toBe(40);
    expect(snapValue(0.1 + 0.2, 0, 1, 0.1)).toBe(0.3);
    expect(snapValue(140, 0, 100, 5)).toBe(100);
  });

  test("a handle pushed into the other stops min-distance short", () => {
    expect(moveThumb("start", 75, { start: 20, end: 70 }, bounds)).toEqual({ start: 60, end: 70 });
    expect(moveThumb("end", 10, { start: 20, end: 70 }, bounds)).toEqual({ start: 20, end: 30 });
    expect(moveThumb("end", 88, { start: 20, end: 70 }, bounds)).toEqual({ start: 20, end: 90 });
  });
});

describe("M3RangeSlider", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("each handle is a keyboard slider bounded by the other", async () => {
    const start = ref(20);
    const end = ref(30);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3RangeSlider, {
            startLabel: "From",
            endLabel: "To",
            step: 5,
            minDistance: 5,
            start: start.value,
            end: end.value,
            "onUpdate:start": (value: number) => (start.value = value),
            "onUpdate:end": (value: number) => (end.value = value),
          }),
      }),
      { global: { plugins: [createM3e()] }, attachTo: document.body },
    );
    const [from, to] = wrapper.findAll("[role=slider]");
    expect(from!.attributes("aria-valuemax")).toBe("30");
    await from!.trigger("keydown", { key: "ArrowRight" });
    await nextTick();
    expect(start.value).toBe(25);
    await from!.trigger("keydown", { key: "ArrowRight" });
    expect(start.value).toBe(25);
    await to!.trigger("keydown", { key: "End" });
    expect(end.value).toBe(100);
  });
});
