import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import {
  M3ListGroup,
  M3TopAppBar,
  createM3e,
  followOffset,
  followPastThreshold,
  nextHideState,
  snapOffset,
  useHideOnScroll,
} from "../src/index.js";

describe("scroll-away maths", () => {
  test("an enter-always bar follows the content, up to its height and never past the top", () => {
    expect(followOffset(0, 20, 300, 64)).toBe(20);
    expect(followOffset(50, 40, 300, 64)).toBe(64);
    expect(followOffset(64, -30, 300, 64)).toBe(34);
    expect(followOffset(40, 10, 30, 64)).toBe(30);
    expect(snapOffset(40, 300, 64)).toBe(64);
    expect(snapOffset(20, 300, 64)).toBe(0);
    expect(snapOffset(60, 40, 64)).toBe(0);
  });

  test("an enter-always bar holds still inside the deadband and a reversal restarts the count", () => {
    let state = followPastThreshold({ offset: 0, travel: 0 }, 20, 300, 64);
    expect(state).toEqual({ offset: 0, travel: 20 });
    state = followPastThreshold(state, 10, 300, 64);
    expect(state).toEqual({ offset: 6, travel: 30 });
    state = followPastThreshold(state, 10, 300, 64);
    expect(state.offset).toBe(16);
    state = followPastThreshold(state, -20, 300, 64);
    expect(state).toEqual({ offset: 16, travel: -20 });
    state = followPastThreshold(state, -10, 300, 64);
    expect(state).toEqual({ offset: 10, travel: -30 });
    expect(followPastThreshold({ offset: 64, travel: 0 }, -5, 40, 64).offset).toBe(40);
    expect(followPastThreshold({ offset: 0, travel: 0 }, 32, 300, 64, 32).offset).toBe(0);
  });

  test("a bottom bar hides past the threshold, flips back on the way up and shows at both ends", () => {
    const at = { top: 500, max: 2000 };
    let state = { hidden: false, travel: 0 };
    state = nextHideState(state, 10, at);
    expect(state.hidden).toBe(false);
    state = nextHideState(state, 20, at);
    expect(state.hidden).toBe(true);
    state = nextHideState(state, -10, at);
    expect(state.hidden).toBe(true);
    state = nextHideState(state, -20, at);
    expect(state.hidden).toBe(false);
    expect(nextHideState({ hidden: true, travel: 50 }, 5, { top: 10, max: 2000 }).hidden).toBe(
      false,
    );
    expect(nextHideState({ hidden: true, travel: 50 }, 5, { top: 2000, max: 2000 }).hidden).toBe(
      false,
    );
  });
});

function scroller() {
  const element = document.createElement("div");
  element.style.overflowY = "auto";
  let top = 0;
  Object.defineProperties(element, {
    scrollTop: { get: () => top, set: (value: number) => (top = value) },
    scrollHeight: { get: () => 3000 },
    clientHeight: { get: () => 600 },
  });
  document.body.append(element);
  const scrollTo = async (value: number) => {
    top = value;
    element.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(20);
  };
  return { element, scrollTo };
}

describe("hiding on scroll", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  test("useHideOnScroll hides going down and shows going up", async () => {
    const { element, scrollTo } = scroller();
    const target = shallowRef<HTMLElement | null>(null);
    let hidden!: ReturnType<typeof useHideOnScroll>["hidden"];
    mount(
      defineComponent({ setup: () => ((hidden = useHideOnScroll(target).hidden), () => h("i")) }),
    );
    target.value = element;
    await nextTick();
    await scrollTo(200);
    expect(hidden.value).toBe(true);
    await scrollTo(150);
    expect(hidden.value).toBe(false);
  });

  test("an enter-always app bar ignores small moves, follows past the deadband and settles", async () => {
    const { element, scrollTo } = scroller();
    mount(M3TopAppBar, {
      props: { title: "Customers", scrollBehavior: "enterAlways" },
      attachTo: element,
      global: { plugins: [createM3e({ reducedMotion: false })] },
    });
    await nextTick();
    const bar = element.querySelector<HTMLElement>(".m3-app-bar")!;
    const offset = () => bar.style.getPropertyValue("--m3-app-bar-offset");
    await scrollTo(20);
    expect(offset()).toBe("");
    await scrollTo(60);
    expect(offset()).toBe("36px");
    expect(bar.hasAttribute("data-following")).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    expect(offset()).toBe("0px");
    expect(bar.hasAttribute("data-following")).toBe(false);
    await scrollTo(300);
    await vi.advanceTimersByTimeAsync(200);
    expect(offset()).toBe("64px");
    await scrollTo(285);
    expect(offset()).toBe("64px");
    await vi.advanceTimersByTimeAsync(200);
    await scrollTo(270);
    expect(offset()).toBe("64px");
    await scrollTo(250);
    expect(offset()).toBe("53px");
  });

  test("a resting enter-always bar reaches the list-group titles, never the scroll container", async () => {
    const { element, scrollTo } = scroller();
    const written = vi.spyOn(element.style, "setProperty");
    const Page = defineComponent(() => () => [
      h(M3TopAppBar, { title: "Products", scrollBehavior: "enterAlways" }),
      h(M3ListGroup, { title: "Drinks" }, () => h("li", "Water")),
    ]);
    mount(Page, {
      attachTo: element,
      global: { plugins: [createM3e({ reducedMotion: true })] },
    });
    await nextTick();
    const title = element.querySelector<HTMLElement>(".m3-list-group__title")!;
    expect(title.classList.contains("m3-list-group__title--still")).toBe(true);
    await scrollTo(120);
    await vi.advanceTimersByTimeAsync(200);
    expect(title.style.getPropertyValue("--m3-app-bar-offset")).toBe("64px");
    expect(element.style.getPropertyValue("--m3-app-bar-offset")).toBe("");
    await scrollTo(50);
    await vi.advanceTimersByTimeAsync(200);
    expect(element.querySelector(".m3-app-bar")!.hasAttribute("data-following")).toBe(true);
    expect(title.style.getPropertyValue("--m3-app-bar-offset")).toBe("0px");
    expect(element.style.getPropertyValue("--m3-app-bar-offset")).toBe("");
    expect(written).not.toHaveBeenCalledWith("--m3-app-bar-offset", expect.anything());
    for (const node of element.querySelectorAll<HTMLElement>(".m3-list-group, li"))
      expect(node.style.getPropertyValue("--m3-app-bar-offset")).toBe("");
  });
});
