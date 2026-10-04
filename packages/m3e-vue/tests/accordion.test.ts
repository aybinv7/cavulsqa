import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3List, M3ListItem, createM3e } from "../src/index.js";

function mountList(accordion: boolean) {
  const open = [ref(false), ref(false), ref(false)];
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(M3List, { accordion }, () =>
          open.map((state, index) =>
            h(
              M3ListItem,
              {
                headline: `Question ${index + 1}`,
                expanded: state.value,
                "onUpdate:expanded": (value: boolean) => (state.value = value),
              },
              { details: () => h("p", `Answer ${index + 1}`) },
            ),
          ),
        ),
    }),
    { global: { plugins: [createM3e({ reducedMotion: true })] } },
  );
  return { wrapper, open };
}

describe("expandable list items", () => {
  test("the row toggles its region and says so", async () => {
    const { wrapper, open } = mountList(false);
    const row = wrapper.findAll("button")[0]!;
    const region = wrapper.findAll(".m3-list-item__details")[0]!;
    expect(row.attributes("aria-expanded")).toBe("false");
    expect(row.attributes("aria-controls")).toBe(region.attributes("id"));
    expect(region.attributes("inert")).toBeDefined();
    await row.trigger("click");
    expect(open[0]!.value).toBe(true);
    expect(row.attributes("aria-expanded")).toBe("true");
    expect(region.attributes("inert")).toBeUndefined();
    expect(wrapper.findAll(".m3-list-item")[0]!.classes()).toContain("m3-list-item--expanded");
  });

  test("an accordion list keeps one open; a plain list lets several", async () => {
    const accordion = mountList(true);
    const rows = accordion.wrapper.findAll("button");
    await rows[0]!.trigger("click");
    await rows[1]!.trigger("click");
    await nextTick();
    expect(accordion.open.map((state) => state.value)).toEqual([false, true, false]);

    const plain = mountList(false);
    const plainRows = plain.wrapper.findAll("button");
    await plainRows[0]!.trigger("click");
    await plainRows[1]!.trigger("click");
    expect(plain.open.map((state) => state.value)).toEqual([true, true, false]);
  });
});
