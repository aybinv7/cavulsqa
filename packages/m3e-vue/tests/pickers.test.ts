import { mount } from "@vue/test-utils";
import { afterEach, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref, type Component } from "vue";
import {
  M3DatePicker,
  M3DateWheel,
  M3TimePicker,
  M3WheelColumn,
  createM3e,
  todayIso,
} from "../src/index.js";

afterEach(() => {
  document.body.innerHTML = "";
});

const tick = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

function host<T>(component: Component, initial: T, props: Record<string, unknown> = {}) {
  const value = ref(initial);
  const open = ref(true);
  const Host = defineComponent({
    setup: () => () =>
      h(component, {
        ...props,
        modelValue: value.value,
        "onUpdate:modelValue": (next: T) => (value.value = next),
        open: open.value,
        "onUpdate:open": (next: boolean) => (open.value = next),
      }),
  });
  mount(Host, { global: { plugins: [createM3e()] }, attachTo: document.body });
  return { value, open };
}

const buttonByText = (text: string) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === text)!;

test("the time picker edits a draft and commits it only on OK", async () => {
  const { value, open } = host(M3TimePicker, "09:30", { hour12: false, locale: "fr" });
  await tick();
  const selectors = [...document.body.querySelectorAll(".m3-time-picker-panel__selector")];
  expect(selectors.map((s) => s.textContent?.trim())).toEqual(["09", "30"]);

  const dial = document.body.querySelector<HTMLElement>(".m3-clock-dial")!;
  dial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
  await tick();
  expect(selectors[0]!.textContent?.trim()).toBe("10");
  expect(value.value).toBe("09:30");

  buttonByText("OK").click();
  await tick();
  expect(value.value).toBe("10:30");
  expect(open.value).toBe(false);
});

test("a twelve-hour time picker shows the half of the day and switches it", async () => {
  const { value } = host(M3TimePicker, "15:05", { hour12: true, locale: "en-US" });
  await tick();
  const selectors = [...document.body.querySelectorAll(".m3-time-picker-panel__selector")];
  expect(selectors.map((s) => s.textContent?.trim())).toEqual(["3", "05"]);
  const periods = [...document.body.querySelectorAll(".m3-time-picker-panel__period-option")];
  expect(periods[1]!.getAttribute("aria-pressed")).toBe("true");

  (periods[0] as HTMLButtonElement).click();
  await tick();
  buttonByText("OK").click();
  await tick();
  expect(value.value).toBe("03:05");
});

test("typed time input rejects an impossible hour and accepts a valid one", async () => {
  const { value } = host(M3TimePicker, "09:30", {
    hour12: false,
    locale: "fr",
    inputLabel: "Keyboard",
  });
  await tick();
  document.body.querySelector<HTMLButtonElement>(".m3-time-picker-panel__mode")!.click();
  await tick();
  const [hour, minute] = [
    ...document.body.querySelectorAll<HTMLInputElement>(".m3-time-picker-panel__input"),
  ];
  hour!.value = "27";
  hour!.dispatchEvent(new Event("input"));
  await tick();
  expect(hour!.getAttribute("aria-invalid")).toBe("true");
  buttonByText("OK").click();
  await tick();
  expect(value.value).toBe("09:30");

  hour!.value = "7";
  hour!.dispatchEvent(new Event("input"));
  minute!.value = "45";
  minute!.dispatchEvent(new Event("input"));
  await tick();
  buttonByText("OK").click();
  await tick();
  expect(value.value).toBe("07:45");
});

test("the sheet date picker switches between the calendar and the wheel", async () => {
  host(M3DatePicker, "2026-02-14", { presentation: "sheet", locale: "fr" });
  await tick();
  expect(document.body.querySelector(".m3-bottom-sheet .m3-calendar")).not.toBeNull();
  document.body.querySelector<HTMLButtonElement>(".m3-date-picker-panel__mode")!.click();
  await tick();
  const columns = [...document.body.querySelectorAll(".m3-wheel-column")];
  expect(columns.map((c) => c.getAttribute("aria-label"))).toEqual(["Day", "Month", "Year"]);
});

test("an empty date wheel starts at today", async () => {
  const value = ref<string | null>(null);
  mount(
    defineComponent({
      setup: () => () =>
        h(M3DateWheel, {
          modelValue: value.value,
          "onUpdate:modelValue": (next: string | null) => (value.value = next),
        }),
    }),
    { global: { plugins: [createM3e()] } },
  );
  await tick();
  expect(value.value).toBe(todayIso());
});

test("a wheel column commits the option it comes to rest on, skipping disabled ones", async () => {
  const value = ref<string | number>("a");
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(M3WheelColumn, {
          label: "Letters",
          itemHeight: 40,
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
            { value: "c", label: "C", disabled: true },
            { value: "d", label: "D" },
          ],
          modelValue: value.value,
          "onUpdate:modelValue": (next: string | number | undefined) => {
            if (next !== undefined) value.value = next;
          },
        }),
    }),
    { global: { plugins: [createM3e()] }, attachTo: document.body },
  );
  const column = wrapper.find(".m3-wheel-column").element as HTMLElement;
  column.scrollTop = 40;
  column.dispatchEvent(new Event("scrollend"));
  await tick();
  expect(value.value).toBe("b");
  expect(column.getAttribute("aria-activedescendant")).toMatch(/-1$/);
});

test("a looping wheel column rolls over and re-centres on its middle copy", async () => {
  const value = ref<string | number>(0);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(M3WheelColumn, {
          label: "Minutes",
          itemHeight: 40,
          loop: true,
          options: [0, 15, 30, 45].map((m) => ({ value: m, label: String(m) })),
          modelValue: value.value,
          "onUpdate:modelValue": (next: string | number | undefined) => {
            if (next !== undefined) value.value = next;
          },
        }),
    }),
    { global: { plugins: [createM3e()] }, attachTo: document.body },
  );
  const column = wrapper.find(".m3-wheel-column").element as HTMLElement;
  expect(column.children).toHaveLength(20);
  expect(column.scrollTop).toBe(8 * 40);

  column.scrollTop = 3 * 40;
  column.dispatchEvent(new Event("scrollend"));
  await tick();
  expect(value.value).toBe(45);
  expect(column.scrollTop).toBe(11 * 40);
});
