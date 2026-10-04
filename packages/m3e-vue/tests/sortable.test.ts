import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3List, M3ListItem, createM3e, moveItem } from "../src/index.js";
import { dropOffset, gapOf, sortFrame } from "../src/utils/sortable.js";

const slots = [0, 1, 2, 3].map((index) => ({ top: index * 74, height: 72 }));

describe("sortable geometry", () => {
  test("the gap is read from the layout", () => {
    expect(gapOf(slots)).toBe(2);
  });

  test("dragging down past a centre moves that item up by one slot", () => {
    expect(sortFrame(slots, 0, 30)).toEqual({ to: 0, shifts: [0, 0, 0, 0] });
    expect(sortFrame(slots, 0, 80)).toEqual({ to: 1, shifts: [0, -74, 0, 0] });
    expect(sortFrame(slots, 0, 160)).toEqual({ to: 2, shifts: [0, -74, -74, 0] });
  });

  test("dragging up moves the passed items down", () => {
    expect(sortFrame(slots, 3, -80)).toEqual({ to: 2, shifts: [0, 0, 74, 0] });
  });

  test("held against either end of the list, the item lands first or last", () => {
    expect(sortFrame(slots, 3, -222).to).toBe(0);
    expect(sortFrame(slots, 0, 222).to).toBe(3);
  });

  test("the drop lands exactly on the target slot, whatever the heights", () => {
    const mixed = [
      { top: 0, height: 56 },
      { top: 58, height: 88 },
      { top: 148, height: 72 },
    ];
    expect(dropOffset(mixed, 0, 2)).toBe(148 + 72 - 56);
    expect(dropOffset(mixed, 2, 0)).toBe(-148);
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });
});

describe("sortable list", () => {
  test("every item gets a handle; arrow keys on it move the item and announce it", async () => {
    const items = ref(["Alger", "Oran", "Blida"]);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            M3List,
            {
              sortable: true,
              onSort: (from: number, to: number) => (items.value = moveItem(items.value, from, to)),
            },
            () => items.value.map((label) => h(M3ListItem, { key: label, headline: label })),
          ),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    await nextTick();
    const handles = wrapper.findAll("[data-sort-handle]");
    expect(handles).toHaveLength(3);
    expect(handles[0]!.attributes("aria-label")).toBe("Reorder");
    await handles[0]!.trigger("keydown", { key: "ArrowDown" });
    await nextTick();
    expect(items.value).toEqual(["Oran", "Alger", "Blida"]);
    expect(document.body.textContent).toContain("Alger, position 2 of 3");
    wrapper.unmount();
  });
});
