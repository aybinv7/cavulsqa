import { mount } from "@vue/test-utils";
import { describe, expect, test, vi } from "vite-plus/test";
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

  test("a settled swipe reports the new page only, never the old one in between", async () => {
    const { wrapper, selected, pager } = mountTabs();
    await nextTick();
    const panels = wrapper.get(".m3-tab-panels").element as HTMLElement;
    vi.spyOn(panels, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 600));
    panels.setPointerCapture = vi.fn();
    const seen: number[] = [];
    const stop = pager.follow((position) => seen.push(position));
    const pointer = (type: string, x: number) =>
      new PointerEvent(type, {
        pointerId: 1,
        isPrimary: true,
        clientX: x,
        clientY: 100,
        bubbles: true,
        button: 0,
      });
    panels.dispatchEvent(pointer("pointerdown", 300));
    panels.dispatchEvent(pointer("pointermove", 280));
    panels.dispatchEvent(pointer("pointermove", 40));
    panels.dispatchEvent(pointer("pointerup", 40));
    await vi.waitFor(() => expect(selected.value).toBe("invoices"));
    const afterMove = seen.slice(seen.findIndex((position) => position > 0.5));
    expect(afterMove.every((position) => position > 0.5)).toBe(true);
    expect(seen.at(-1)).toBe(1);
    stop();
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

describe("tab indicator", () => {
  test("a swipe that lands on a tab is not replayed when the selection catches up", async () => {
    const rect = (left: number, width: number) =>
      ({
        left,
        width,
        top: 0,
        height: 48,
        right: left + width,
        bottom: 48,
        x: left,
        y: 0,
      }) as DOMRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const value = this.dataset.value;
        return value ? rect(TABS.indexOf(value) * 100, 100) : rect(0, 400);
      },
    );
    const selected = ref("orders");
    const pager = createTabPager();
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            M3Tabs,
            {
              modelValue: selected.value,
              "onUpdate:modelValue": (value: string | undefined) => (selected.value = value ?? ""),
              pager,
              variant: "secondary",
            },
            () => TABS.map((value) => h(M3Tab, { key: value, value, label: value })),
          ),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    await nextTick();
    await nextTick();
    const bar = wrapper.get(".m3-tabs__indicator").element as HTMLElement;
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(bar.style.transform));
    observer.observe(bar, { attributes: true, attributeFilter: ["style"] });

    pager.update(0.5);
    pager.update(1);
    selected.value = "invoices";
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    observer.disconnect();

    const after = seen.slice(seen.indexOf("translateX(100px)"));
    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toContain("translateX(0px)");
    expect(bar.style.transform).toBe("translateX(100px)");
    wrapper.unmount();
    vi.restoreAllMocks();
  });
});
