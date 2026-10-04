import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3List, M3SmartSelect, createM3e } from "../src/index.js";

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((label, value) => ({
  value,
  label,
}));

function mountSelect(multiple: boolean, initial: number | number[] | null, searchFrom = 10) {
  const model = ref<unknown>(initial);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(M3List, null, () =>
          h(M3SmartSelect, {
            label: "Delivery days",
            options: DAYS,
            multiple,
            searchFrom,
            placeholder: "None",
            modelValue: model.value as never,
            "onUpdate:modelValue": (value: unknown) => (model.value = value),
          }),
        ),
    }),
    { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
  );
  return { wrapper, model };
}

const options = () => [...document.body.querySelectorAll<HTMLElement>("[role=option]")];

describe("M3SmartSelect", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("the row names the choice; one choice closes the sheet", async () => {
    const { wrapper, model } = mountSelect(false, 2);
    expect(wrapper.text()).toContain("Mon");
    await wrapper.get("button").trigger("click");
    await nextTick();
    expect(
      document.body.querySelector("[role=listbox]")?.getAttribute("aria-multiselectable"),
    ).toBeNull();
    options()[4]!.click();
    await nextTick();
    expect(model.value).toBe(4);
    expect(wrapper.text()).toContain("Wed");
  });

  test("several choices toggle and keep the options' order", async () => {
    const { wrapper, model } = mountSelect(true, [5]);
    await wrapper.get("button").trigger("click");
    await nextTick();
    for (const index of [1, 5, 3]) {
      options()[index]!.click();
      await nextTick();
    }
    expect(model.value).toEqual([1, 3]);
    expect(wrapper.text()).toContain("Sun, Tue");
  });

  test("a long list gets a search field that ignores case", async () => {
    const { wrapper } = mountSelect(false, null, 5);
    expect(wrapper.text()).toContain("None");
    await wrapper.get("button").trigger("click");
    await nextTick();
    const search = document.body.querySelector<HTMLInputElement>("input")!;
    search.value = "TU";
    search.dispatchEvent(new Event("input"));
    await nextTick();
    expect(options().map((option) => option.textContent?.trim())).toEqual(["Tue"]);
  });
});
