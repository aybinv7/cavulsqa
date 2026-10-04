import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3SearchView, createM3e } from "../src/index.js";
import { SEARCH_BAR_RADIUS, searchFrame } from "../src/utils/searchExpansion.js";

const bar = { left: 16, top: 120, width: 394, height: 56 };
const viewport = { width: 426, height: 952 };
const rest = { top: 60 };

describe("search expansion frames", () => {
  test("closed, the surface and the header sit exactly on the bar", () => {
    const frame = searchFrame(0, bar, viewport, rest);
    expect(frame.clip).toBe(`inset(120px 16px 776px 16px round ${SEARCH_BAR_RADIUS}px)`);
    expect(frame.headerX).toBe(16);
    expect(frame.headerY).toBe(60);
    expect(frame.headerWidth).toBe(394);
    expect(frame.reveal).toBe(0);
  });

  test("open, the surface fills the viewport with square corners and the header rests", () => {
    const frame = searchFrame(1, bar, viewport, rest);
    expect(frame.clip).toBe("inset(0px 0px 0px 0px round 0px)");
    expect(frame.headerX).toBe(0);
    expect(frame.headerY).toBe(0);
    expect(frame.headerWidth).toBe(426);
  });

  test("half way, everything sits half way, and an overshooting spring is clamped", () => {
    const frame = searchFrame(0.5, bar, viewport, rest);
    expect(frame.headerY).toBe(30);
    expect(frame.headerWidth).toBe(410);
    expect(searchFrame(1.08, bar, viewport, rest).headerWidth).toBe(426);
  });
});

describe("M3SearchView", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountView() {
    const query = ref("");
    const expanded = ref(false);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            M3SearchView,
            {
              placeholder: "Search orders",
              modelValue: query.value,
              "onUpdate:modelValue": (value: string) => (query.value = value),
              expanded: expanded.value,
              "onUpdate:expanded": (value: boolean) => (expanded.value = value),
            },
            {
              default: ({ query: q }: { query: string }) =>
                h("p", { class: "results" }, `for ${q}`),
            },
          ),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { wrapper, query, expanded };
  }

  test("tapping the bar opens the view, focuses its input and shows the results", async () => {
    const { wrapper, expanded } = mountView();
    await wrapper.find(".m3-search-view-bar__hit").trigger("click");
    await nextTick();
    expect(expanded.value).toBe(true);
    const input = document.body.querySelector<HTMLInputElement>(".m3-search-view__input")!;
    expect(document.activeElement).toBe(input);
    expect(document.body.querySelector(".results")).not.toBeNull();
  });

  test("typing updates the query, clear empties it, and the back arrow closes", async () => {
    const { wrapper, query, expanded } = mountView();
    await wrapper.find(".m3-search-view-bar__hit").trigger("click");
    const input = document.body.querySelector<HTMLInputElement>(".m3-search-view__input")!;
    input.value = "SO-35";
    input.dispatchEvent(new Event("input"));
    await nextTick();
    expect(query.value).toBe("SO-35");
    expect(document.body.querySelector(".results")?.textContent).toBe("for SO-35");

    document.body.querySelector<HTMLButtonElement>(".m3-search-view__clear")!.click();
    await nextTick();
    expect(query.value).toBe("");

    document.body.querySelector<HTMLButtonElement>(".m3-search-view__back")!.click();
    await nextTick();
    expect(expanded.value).toBe(false);
  });
});
