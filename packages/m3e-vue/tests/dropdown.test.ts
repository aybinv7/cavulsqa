import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3ExposedDropdown, createM3e } from "../src/index.js";
import {
  filterOptions,
  highlightParts,
  nextEnabled,
  searchKey,
  typeahead,
} from "../src/utils/dropdown.js";

const CITIES = ["Alger", "Oran", "Constantine", "Béjaïa", "Blida", "Annaba"].map((label) => ({
  value: label.toLowerCase(),
  label,
}));

describe("dropdown search", () => {
  test("matching ignores case and accents, with starts-with first", () => {
    expect(searchKey("Béjaïa")).toBe("bejaia");
    expect(filterOptions(CITIES, "bej", 10).map((o) => o.label)).toEqual(["Béjaïa"]);
    expect(filterOptions(CITIES, "an", 10).map((o) => o.label)).toEqual([
      "Annaba",
      "Oran",
      "Constantine",
    ]);
    expect(filterOptions(CITIES, "", 3)).toHaveLength(3);
  });

  test("the match is located in the label even through accents", () => {
    expect(highlightParts("Béjaïa", "jai")).toEqual({ before: "Bé", match: "jaï", after: "a" });
    expect(highlightParts("Oran", "x")).toBeNull();
    expect(highlightParts("Oran", " ")).toBeNull();
  });

  test("movement skips disabled options and wraps; type-ahead cycles", () => {
    const options = [
      { value: 1, label: "A" },
      { value: 2, label: "B", disabled: true },
      { value: 3, label: "Ab" },
    ];
    expect(nextEnabled(options, 0, 1)).toBe(2);
    expect(nextEnabled(options, 2, 1)).toBe(0);
    expect(typeahead(options, "a", 0)).toBe(2);
    expect(typeahead(options, "a", 2)).toBe(0);
  });
});

describe("M3ExposedDropdown", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountDropdown(editable: boolean) {
    const value = ref<string | null>("oran");
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3ExposedDropdown, {
            label: "City",
            options: CITIES,
            editable,
            modelValue: value.value,
            "onUpdate:modelValue": (next: unknown) => (value.value = next as string | null),
          }),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { wrapper, value, input: wrapper.get("input") };
  }

  test("a select opens on ArrowDown at the chosen option and Enter picks the next", async () => {
    const { input, value } = mountDropdown(false);
    expect(input.attributes("role")).toBe("combobox");
    expect(input.element.value).toBe("Oran");
    await input.trigger("keydown", { key: "ArrowDown" });
    await nextTick();
    expect(input.attributes("aria-expanded")).toBe("true");
    const active = input.attributes("aria-activedescendant")!;
    expect(document.getElementById(active)?.textContent).toContain("Oran");
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    expect(value.value).toBe("constantine");
    expect(input.attributes("aria-expanded")).toBe("false");
  });

  test("an autocomplete filters as you type and restores the label when left unchosen", async () => {
    const { input, value } = mountDropdown(true);
    await input.setValue("bej");
    await nextTick();
    const options = document.body.querySelectorAll("[role=option]");
    expect(options).toHaveLength(1);
    expect(options[0]!.querySelector("strong")?.textContent).toBe("Béj");
    await input.trigger("keydown", { key: "Escape" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await nextTick();
    expect(value.value).toBe("oran");
    expect(input.element.value).toBe("Oran");
  });

  test("tapping a filtered option chooses it", async () => {
    const { input, value } = mountDropdown(true);
    await input.setValue("ann");
    await nextTick();
    (document.body.querySelector("[role=option]") as HTMLElement).click();
    await nextTick();
    expect(value.value).toBe("annaba");
    expect(input.element.value).toBe("Annaba");
  });
});
