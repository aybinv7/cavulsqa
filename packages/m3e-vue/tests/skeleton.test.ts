import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { h } from "vue";
import { M3Skeleton, M3SkeletonBlock, M3SkeletonText } from "../src/index.js";

describe("skeleton loading", () => {
  test("announces one busy status with its label", () => {
    const wrapper = mount(M3Skeleton, {
      props: { label: "Loading orders" },
      slots: { default: () => h(M3SkeletonText, { lines: 2 }) },
    });
    const root = wrapper.get(".m3-skeleton");
    expect(root.attributes("role")).toBe("status");
    expect(root.attributes("aria-busy")).toBe("true");
    expect(root.text()).toBe("Loading orders");
  });

  test("a paragraph's last line stops short; a single line runs full", () => {
    const widths = (lines: number) =>
      mount(M3SkeletonText, { props: { lines } })
        .findAll(".m3-skeleton-text__bar")
        .map((bar) => bar.attributes("style"));
    expect(widths(3)).toEqual(["width: 100%;", "width: 94%;", "width: 62%;"]);
    expect(widths(1)).toEqual(["width: 100%;"]);
  });

  test("a circle takes its width for both sides and numbers are px", () => {
    const block = mount(M3SkeletonBlock, { props: { shape: "circle", width: 40 } });
    expect(block.attributes("style")).toBe("width: 40px; height: 40px;");
  });
});
