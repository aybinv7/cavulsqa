import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3PageIndicator, M3Pager, M3PagerPage, createM3e } from "../src/index.js";

const plugins = [createM3e({ reducedMotion: true })];

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("M3PageIndicator", () => {
  test("the pill slides between dots with a fractional page", () => {
    const wrapper = mount(M3PageIndicator, {
      props: { count: 3, progress: 0.25, pageLabel: (n: number) => `Step ${n}` },
    });
    const dots = wrapper.findAll("button");
    const active = dots.map((dot) =>
      Number((dot.element as HTMLElement).style.getPropertyValue("--m3-dot-active")),
    );
    expect(active).toEqual([0.75, 0.25, 0]);
    expect(dots[0]!.attributes("aria-current")).toBe("step");
    expect(dots[2]!.attributes("aria-label")).toBe("Step 3");
  });

  test("a dot selects its page", async () => {
    const wrapper = mount(M3PageIndicator, { props: { count: 3, progress: 0 } });
    await wrapper.findAll("button")[2]!.trigger("click");
    expect(wrapper.emitted("select")).toEqual([[2]]);
  });
});

describe("M3Pager", () => {
  const WIDTH = 300;

  function pager(start = 0) {
    const page = shallowRef(start);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(WIDTH);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            M3Pager,
            {
              label: "Welcome",
              page: page.value,
              "onUpdate:page": (value: number) => (page.value = value),
            },
            () => [1, 2, 3].map((n) => h(M3PagerPage, { key: n }, () => `page ${n}`)),
          ),
      }),
      { attachTo: document.body, global: { plugins } },
    );
    const track = wrapper.get(".m3-pager__track").element as HTMLElement;
    track.scrollTo = ((options: ScrollToOptions) => {
      track.scrollLeft = options.left ?? 0;
      track.dispatchEvent(new Event("scrollend"));
    }) as never;
    return { wrapper, page, track };
  }

  test("labels its pages, keeps off-screen ones inert and counts the dots", async () => {
    const { wrapper } = pager();
    await nextTick();
    const pages = wrapper.findAll(".m3-pager-page");
    expect(pages.map((entry) => entry.attributes("aria-label"))).toEqual([
      "1 / 3",
      "2 / 3",
      "3 / 3",
    ]);
    expect(pages.map((entry) => entry.attributes("inert") !== undefined)).toEqual([
      false,
      true,
      true,
    ]);
    expect(wrapper.findAll(".m3-page-indicator__dot")).toHaveLength(3);
    expect(wrapper.get("section").attributes("aria-roledescription")).toBe("carousel");
  });

  test("the arrow keys and End turn pages and the model follows where it settles", async () => {
    const { wrapper, page, track } = pager();
    await nextTick();
    await wrapper.get(".m3-pager__track").trigger("keydown", { key: "ArrowRight" });
    expect(track.scrollLeft).toBe(WIDTH);
    expect(page.value).toBe(1);
    await wrapper.get(".m3-pager__track").trigger("keydown", { key: "End" });
    expect(page.value).toBe(2);
    await nextTick();
    expect(wrapper.findAll(".m3-pager-page")[2]!.attributes("inert")).toBeUndefined();
  });

  test("setting the model scrolls to that page", async () => {
    const { page, track } = pager();
    await nextTick();
    page.value = 2;
    await nextTick();
    await nextTick();
    expect(track.scrollLeft).toBe(2 * WIDTH);
  });
});
