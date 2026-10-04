import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3Stepper, createM3e } from "../src/index.js";
import { decimalsOf, parseTyped, repeatSteps, snapStep, stepBy } from "../src/utils/stepper.js";

describe("stepper arithmetic", () => {
  const bounds = { min: 0, max: 2, step: 0.1 };

  test("decimal steps stay clean", () => {
    expect(decimalsOf(0.1)).toBe(1);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(1e-7)).toBe(7);
    expect(stepBy(0.2, 1, bounds)).toBe(0.3);
    expect(stepBy(1.95, 1, bounds)).toBe(2);
  });

  test("typed values snap to the grid and the bounds; a decimal comma is read", () => {
    expect(parseTyped("1,26")).toBe(1.26);
    expect(parseTyped(" 12 ")).toBe(12);
    expect(parseTyped("abc")).toBeNull();
    expect(parseTyped("1.2.3")).toBeNull();
    expect(snapStep(1.26, bounds)).toBe(1.3);
    expect(snapStep(9, bounds)).toBe(2);
  });

  test("holding speeds up only across a wide range", () => {
    const wide = { min: 0, max: 1000, step: 1 };
    expect([0, 1600, 3200].map((held) => repeatSteps(held, wide))).toEqual([1, 5, 10]);
    expect(repeatSteps(5000, { min: 0, max: 10, step: 1 })).toBe(1);
  });
});

describe("M3Stepper", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mountStepper(initial = 5, extra: Record<string, unknown> = {}) {
    const model = ref(initial);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3Stepper, {
            label: "Guests",
            min: 0,
            max: 100,
            modelValue: model.value,
            "onUpdate:modelValue": (value: number) => (model.value = value),
            ...extra,
          }),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { wrapper, model };
  }

  test("a tap steps once; holding repeats until released", async () => {
    const { wrapper, model } = mountStepper();
    await vi.advanceTimersByTimeAsync(0);
    const plus = wrapper.findAll("button")[1]!;
    plus.element.dispatchEvent(new PointerEvent("pointerdown", { button: 0, isPrimary: true }));
    plus.element.dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true }));
    expect(model.value).toBe(6);
    await vi.advanceTimersByTimeAsync(400 + 100 * 3);
    expect(model.value).toBe(10);
    window.dispatchEvent(new PointerEvent("pointerup"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(model.value).toBe(10);
  });

  test("keyboard activation of a button steps exactly once", async () => {
    const { wrapper, model } = mountStepper();
    wrapper.findAll("button")[0]!.element.dispatchEvent(new MouseEvent("click", { detail: 0 }));
    expect(model.value).toBe(4);
  });

  test("the value is a spinbutton: arrows, pages and the bounds", async () => {
    const { wrapper, model } = mountStepper();
    const input = wrapper.get("input");
    expect(input.attributes("role")).toBe("spinbutton");
    await input.trigger("keydown", { key: "ArrowUp" });
    await input.trigger("keydown", { key: "PageUp" });
    expect(model.value).toBe(16);
    await input.trigger("keydown", { key: "End" });
    expect(model.value).toBe(100);
    await nextTick();
    expect(wrapper.findAll("button")[1]!.attributes("disabled")).toBeDefined();
  });

  test("an editable value commits typed text snapped to the step", async () => {
    const { wrapper, model } = mountStepper(5, { editable: true, step: 5 });
    const input = wrapper.get("input");
    input.element.value = "23";
    await input.trigger("input");
    await input.trigger("change");
    expect(model.value).toBe(25);
  });
});
