import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3Tab, M3TabPanel, M3TabPanels, M3Tabs, createM3e, createTabPager } from "../src/index.js";

const TABS = ["orders", "invoices", "payments", "returns"];

function mountTabs() {
  const selected = ref("orders");
  const pager = createTabPager();
  const wrapper = mount(
    defineComponent({
      setup: () => () => [
        h(
          M3Tabs,
          {
            modelValue: selected.value,
            "onUpdate:modelValue": (value: string | undefined) => (selected.value = value ?? ""),
            pager,
          },
          () => TABS.map((value) => h(M3Tab, { key: value, value, label: value })),
        ),
        h(
          M3TabPanels,
          {
            modelValue: selected.value,
            "onUpdate:modelValue": (value: string | undefined) => (selected.value = value ?? ""),
            pager,
          },
          () =>
            TABS.map((value) =>
              h(M3TabPanel, { key: value, value, label: value }, () => h("p", `${value} page`)),
            ),
        ),
      ],
    }),
    { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
  );
  return { wrapper, selected, pager };
}

describe("swipeable tab panels", () => {
  test("only the showing panel and its neighbours render, and visited ones stay", async () => {
    const { wrapper, selected } = mountTabs();
    await nextTick();
    await nextTick();
    const text = () => wrapper.findAll("[role=tabpanel] p").map((p) => p.text());
    expect(text()).toEqual(["orders page", "invoices page"]);
    selected.value = "returns";
    await nextTick();
    await nextTick();
    expect(text()).toEqual(["orders page", "payments page", "returns page"]);
    wrapper.unmount();
  });

  test("a tab click selects its panel; the others are inert", async () => {
    const { wrapper } = mountTabs();
    await nextTick();
    await wrapper.findAll("[role=tab]")[2]!.trigger("click");
    await nextTick();
    const panels = wrapper.findAll("[role=tabpanel]");
    expect(panels[2]!.attributes("inert")).toBeUndefined();
    expect(panels[0]!.attributes("inert")).toBeDefined();
    wrapper.unmount();
  });

  test("the pager carries a fractional position to every follower", () => {
    const pager = createTabPager();
    const seen: number[] = [];
    const stop = pager.follow((position) => seen.push(position));
    pager.update(1.4);
    stop();
    pager.update(2);
    expect(seen).toEqual([1.4]);
  });
});
