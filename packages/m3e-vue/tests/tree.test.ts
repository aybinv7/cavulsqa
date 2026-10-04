import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3Tree, createM3e } from "../src/index.js";
import { checkState, leafIds, toggleCheck, visibleRows, type TreeNode } from "../src/utils/tree.js";

const TREE: TreeNode[] = [
  {
    id: "drinks",
    label: "Drinks",
    children: [
      { id: "water", label: "Water" },
      {
        id: "juice",
        label: "Juice",
        children: [
          { id: "orange", label: "Orange" },
          { id: "apple", label: "Apple" },
        ],
      },
    ],
  },
  { id: "dairy", label: "Dairy", lazy: true },
];

describe("tree arithmetic", () => {
  test("only open branches show their children, with level and position", () => {
    const rows = visibleRows(TREE, new Set(["drinks"]));
    expect(rows.map((row) => [row.node.id, row.level, row.position, row.siblings])).toEqual([
      ["drinks", 1, 1, 2],
      ["water", 2, 1, 2],
      ["juice", 2, 2, 2],
      ["dairy", 1, 2, 2],
    ]);
    expect(rows.find((row) => row.node.id === "dairy")?.branch).toBe(true);
  });

  test("a branch is checked, mixed or clear from its leaves; toggling fills or clears it", () => {
    const drinks = TREE[0]!;
    expect(leafIds(drinks)).toEqual(["water", "orange", "apple"]);
    expect(checkState(drinks, new Set(["orange"]))).toBe("mixed");
    const all = toggleCheck(drinks, new Set(["orange"]));
    expect([...all].sort()).toEqual(["apple", "orange", "water"]);
    expect(checkState(drinks, all)).toBe("checked");
    expect(toggleCheck(drinks, all).size).toBe(0);
  });
});

describe("M3Tree", () => {
  function mountTree(mode: "select" | "check") {
    const expanded = ref<string[]>([]);
    const selected = ref<string | null>(null);
    const checked = ref<string[]>([]);
    const load = async () => [{ id: "milk", label: "Milk" }];
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3Tree, {
            items: TREE,
            label: "Categories",
            mode,
            load,
            expanded: expanded.value,
            "onUpdate:expanded": (value: string[]) => (expanded.value = value),
            selected: selected.value,
            "onUpdate:selected": (value: string | null) => (selected.value = value),
            checked: checked.value,
            "onUpdate:checked": (value: string[]) => (checked.value = value),
          }),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { wrapper, expanded, selected, checked };
  }

  test("Right opens, Down moves into the branch, Left steps back out, Enter selects", async () => {
    const { wrapper, expanded, selected } = mountTree("select");
    const row = (id: string) => wrapper.get(`[data-tree-id="${id}"]`);
    await row("drinks").trigger("keydown", { key: "ArrowRight" });
    await nextTick();
    expect(expanded.value).toEqual(["drinks"]);
    expect(row("drinks").attributes("aria-expanded")).toBe("true");
    await row("drinks").trigger("keydown", { key: "ArrowDown" });
    await row("water").trigger("keydown", { key: "Enter" });
    expect(selected.value).toBe("water");
    await row("water").trigger("keydown", { key: "ArrowLeft" });
    await nextTick();
    expect(document.activeElement?.getAttribute("data-tree-id")).toBe("drinks");
    wrapper.unmount();
  });

  test("checking a branch checks its leaves and shows the parent mixed", async () => {
    const { wrapper, checked, expanded } = mountTree("check");
    expanded.value = ["drinks", "juice"];
    await nextTick();
    await wrapper.get('[data-tree-id="juice"]').trigger("click");
    await nextTick();
    expect([...checked.value].sort()).toEqual(["apple", "orange"]);
    expect(wrapper.get('[data-tree-id="drinks"]').attributes("aria-checked")).toBe("mixed");
    expect(wrapper.get('[data-tree-id="juice"]').attributes("aria-checked")).toBe("true");
    wrapper.unmount();
  });

  test("a lazy branch loads its children the first time it opens", async () => {
    const { wrapper } = mountTree("select");
    await wrapper.get('[data-tree-id="dairy"] .m3-tree__toggle').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-tree-id="milk"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
