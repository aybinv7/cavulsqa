import { mount } from "@vue/test-utils";
import { describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { createM3e, useSwipeStep, type SwipeStep } from "../src/index.js";

function harness(canStep?: (step: SwipeStep) => boolean) {
  const steps: SwipeStep[] = [];
  const wrapper = mount(
    defineComponent({
      setup() {
        const target = ref<HTMLElement | null>(null);
        useSwipeStep({ target, onStep: (step) => void steps.push(step), canStep });
        return () => h("div", { ref: target, class: "content" }, "day");
      },
    }),
    { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
  );
  const element = wrapper.get(".content").element as HTMLElement;
  Object.defineProperty(element, "clientWidth", { value: 360 });
  element.setPointerCapture = vi.fn();
  const pointer = (type: string, x: number) =>
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      clientX: x,
      clientY: 100,
      bubbles: true,
      button: 0,
    });
  const drag = async (from: number, to: number) => {
    await nextTick();
    element.dispatchEvent(pointer("pointerdown", from));
    element.dispatchEvent(pointer("pointermove", from + Math.sign(to - from) * 12));
    element.dispatchEvent(pointer("pointermove", to));
    element.dispatchEvent(pointer("pointerup", to));
    await nextTick();
    await nextTick();
  };
  return { wrapper, steps, drag, element };
}

describe("useSwipeStep", () => {
  test("a swipe toward the start steps forward, toward the end steps back", async () => {
    const { wrapper, steps, drag } = harness();
    await drag(300, 100);
    await drag(60, 280);
    expect(steps).toEqual([1, -1]);
    wrapper.unmount();
  });

  test("a short, slow drag springs back without a step", async () => {
    const { wrapper, steps, element } = harness();
    await nextTick();
    vi.useFakeTimers();
    const pointer = (type: string, x: number) =>
      new PointerEvent(type, {
        pointerId: 1,
        isPrimary: true,
        clientX: x,
        clientY: 100,
        bubbles: true,
        button: 0,
      });
    element.dispatchEvent(pointer("pointerdown", 300));
    for (const x of [288, 280, 270, 260]) {
      vi.advanceTimersByTime(120);
      element.dispatchEvent(pointer("pointermove", x));
    }
    vi.advanceTimersByTime(120);
    element.dispatchEvent(pointer("pointerup", 260));
    vi.useRealTimers();
    await nextTick();
    expect(steps).toEqual([]);
    expect(element.style.transform).toBe("");
    wrapper.unmount();
  });

  test("at an end the drag resists and nothing steps", async () => {
    const { wrapper, steps, drag } = harness((step) => step === -1);
    await drag(300, 60);
    expect(steps).toEqual([]);
    await drag(60, 300);
    expect(steps).toEqual([-1]);
    wrapper.unmount();
  });

  test("a vertical drag is left to scrolling", async () => {
    const { wrapper, steps, element } = harness();
    await nextTick();
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        pointerId: 1,
        isPrimary: true,
        clientX: x,
        clientY: y,
        bubbles: true,
        button: 0,
      });
    element.dispatchEvent(pointer("pointerdown", 200, 100));
    element.dispatchEvent(pointer("pointermove", 202, 140));
    element.dispatchEvent(pointer("pointermove", 120, 300));
    element.dispatchEvent(pointer("pointerup", 120, 300));
    await nextTick();
    expect(steps).toEqual([]);
    wrapper.unmount();
  });
});
