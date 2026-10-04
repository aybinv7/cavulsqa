import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { h } from "vue";
import { M3InfiniteScroll, M3Timeline, M3TimelineItem, createM3e } from "../src/index.js";

const plugins = [createM3e({ reducedMotion: true })];

describe("M3Timeline", () => {
  test("marks the current step and reads each step's state with its title", () => {
    const wrapper = mount(M3Timeline, {
      props: { label: "SO-1024" },
      slots: {
        default: () => [
          h(M3TimelineItem, { title: "Confirmed", state: "done", stateLabel: "done" }),
          h(M3TimelineItem, { title: "Out for delivery", state: "current", stateLabel: "now" }),
          h(M3TimelineItem, { title: "Delivered", stateLabel: "next" }),
        ],
      },
      global: { plugins },
    });
    const items = wrapper.findAll("li");
    expect(wrapper.get("ol").attributes("aria-label")).toBe("SO-1024");
    expect(items.map((item) => item.attributes("aria-current"))).toEqual([
      undefined,
      "step",
      undefined,
    ]);
    expect(items[0]!.find(".m3-timeline-item__title").text()).toBe("Confirmed, done");
    expect(items[2]!.classes()).toContain("m3-timeline-item--upcoming");
  });
});

describe("M3InfiniteScroll", () => {
  test("a failed page waits for retry; a page resolving false ends the list", async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return false;
    };
    const wrapper = mount(M3InfiniteScroll, {
      props: { load, endText: "That is everything", errorText: "Could not load" },
      global: { plugins },
    });
    (wrapper.vm as unknown as { retry: () => void }).retry();
    await flushPromises();
    expect(wrapper.text()).toContain("Could not load");
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(calls).toBe(2);
    expect(wrapper.text()).toContain("That is everything");
  });

  test("only one page loads at a time", async () => {
    let calls = 0;
    let release!: () => void;
    const load = () => {
      calls += 1;
      return new Promise<void>((resolve) => (release = resolve));
    };
    const wrapper = mount(M3InfiniteScroll, { props: { load }, global: { plugins } });
    const api = wrapper.vm as unknown as { retry: () => void };
    api.retry();
    api.retry();
    await flushPromises();
    expect(calls).toBe(1);
    expect(wrapper.find("[role=status]").exists()).toBe(true);
    release();
    await flushPromises();
  });
});
