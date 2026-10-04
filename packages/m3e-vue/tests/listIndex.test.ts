import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { M3ListIndex, createM3e } from "../src/index.js";
import { groupKey, indexKeyAt } from "../src/utils/listIndex.js";

describe("list index", () => {
  test("the key under the finger, held inside the rail", () => {
    const keys = ["A", "B", "C", "D"];
    expect(indexKeyAt(0, 0, 400, keys)).toBe("A");
    expect(indexKeyAt(150, 0, 400, keys)).toBe("B");
    expect(indexKeyAt(400, 0, 400, keys)).toBe("D");
    expect(indexKeyAt(-30, 0, 400, keys)).toBe("A");
    expect(indexKeyAt(10, 0, 400, [])).toBeNull();
  });

  test("labels group by their first letter, accents folded, the rest under #", () => {
    expect(groupKey("Épicerie Saïd")).toBe("E");
    expect(groupKey(" oran market")).toBe("O");
    expect(groupKey("3 Frères")).toBe("#");
  });

  test("the rail is one slider whose arrows step through the letters", async () => {
    const wrapper = mount(M3ListIndex, {
      props: { keys: ["A", "B", "C"], label: "Jump to letter" },
      global: { plugins: [createM3e({ reducedMotion: true })] },
    });
    const rail = wrapper.get("[role=slider]");
    expect(rail.attributes("aria-valuetext")).toBe("A");
    await rail.trigger("keydown", { key: "ArrowDown" });
    await rail.trigger("keydown", { key: "ArrowDown" });
    expect(rail.attributes("aria-valuetext")).toBe("C");
    await rail.trigger("keydown", { key: "Home" });
    expect(rail.attributes("aria-valuetext")).toBe("A");
  });
});
