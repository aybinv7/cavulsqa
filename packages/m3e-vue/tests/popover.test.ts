import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3Popover, createM3e } from "../src/index.js";
import { placePopover } from "../src/utils/popoverPlacement.js";

const VIEW = { width: 360, height: 640 };
const box = (left: number, top: number, width = 40, height = 40) => ({
  left,
  top,
  width,
  right: left + width,
  bottom: top + height,
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("popover placement", () => {
  test("opens below, centred, and grows from the anchor", () => {
    const spot = placePopover(box(160, 100), { width: 200, height: 120 }, VIEW);
    expect(spot).toMatchObject({ side: "bottom", top: 148, left: 80, originY: 0 });
    expect(spot.originX).toBe(100);
  });

  test("flips above when the bottom is short, and stays inside the screen", () => {
    const spot = placePopover(box(330, 560), { width: 200, height: 120 }, VIEW);
    expect(spot.side).toBe("top");
    expect(spot.top).toBe(560 - 8 - 120);
    expect(spot.left).toBe(VIEW.width - 8 - 200);
    expect(spot.originY).toBe(120);
  });

  test("start and end alignment mirror right to left", () => {
    const anchor = box(100, 100, 80);
    const size = { width: 200, height: 100 };
    expect(placePopover(anchor, size, VIEW, { align: "start" }).left).toBe(100);
    expect(placePopover(anchor, size, VIEW, { align: "end" }).left).toBe(8);
    expect(placePopover(anchor, size, VIEW, { align: "start", rtl: true }).left).toBe(8);
  });

  test("too tall for either side takes the roomier one and caps its height", () => {
    const spot = placePopover(box(160, 200), { width: 200, height: 900 }, VIEW);
    expect(spot.side).toBe("bottom");
    expect(spot.maxHeight).toBe(640 - 240 - 16);
  });
});

function harness(modal = false) {
  const open = shallowRef(false);
  const anchor = shallowRef<HTMLElement | null>(null);
  const wrapper = mount(
    defineComponent({
      setup: () => () => [
        h("button", { ref: (element) => (anchor.value = element as HTMLElement), id: "anchor" }),
        h("button", { id: "elsewhere" }),
        h(
          M3Popover,
          {
            anchor: anchor.value,
            label: "Filters",
            modal,
            open: open.value,
            "onUpdate:open": (value: boolean) => (open.value = value),
          },
          () => h("button", { id: "inside" }, "Apply"),
        ),
      ],
    }),
    { attachTo: document.body, global: { plugins: [createM3e({ reducedMotion: true })] } },
  );
  return { wrapper, open };
}

describe("M3Popover", () => {
  test("opens as a labelled dialog, takes focus and closes on a tap outside", async () => {
    const { wrapper, open } = harness();
    open.value = true;
    await nextTick();
    await nextTick();
    const panel = document.querySelector<HTMLElement>(".m3-popover")!;
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-label")).toBe("Filters");
    expect(document.activeElement).toBe(panel);
    document.getElementById("inside")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(open.value).toBe(true);
    document
      .getElementById("elsewhere")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(open.value).toBe(false);
    wrapper.unmount();
  });

  test("focus leaving it closes it, unless it is modal", async () => {
    for (const modal of [false, true]) {
      const { wrapper, open } = harness(modal);
      open.value = true;
      await nextTick();
      await nextTick();
      const panel = document.querySelector<HTMLElement>(".m3-popover")!;
      panel.dispatchEvent(
        new FocusEvent("focusout", { relatedTarget: document.getElementById("elsewhere") }),
      );
      document
        .getElementById("elsewhere")!
        .dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(open.value).toBe(modal);
      if (modal) expect(document.querySelector(".m3-popover-scrim")).not.toBeNull();
      wrapper.unmount();
    }
  });

  test("Escape closes it through the overlay stack", async () => {
    const { wrapper, open } = harness();
    open.value = true;
    await nextTick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(open.value).toBe(false);
    wrapper.unmount();
  });

  test("closing hands focus back to the button inside a wrapper anchor", async () => {
    const open = shallowRef(false);
    const anchor = shallowRef<HTMLElement | null>(null);
    const wrapper = mount(
      defineComponent({
        setup: () => () => [
          h("div", { ref: (element) => (anchor.value = element as HTMLElement) }, [
            h("button", { id: "trigger" }),
          ]),
          h(M3Popover, {
            anchor: anchor.value,
            label: "Quantity",
            open: open.value,
            "onUpdate:open": (value: boolean) => (open.value = value),
          }),
        ],
      }),
      { attachTo: document.body, global: { plugins: [createM3e({ reducedMotion: true })] } },
    );
    open.value = true;
    await nextTick();
    await nextTick();
    open.value = false;
    await nextTick();
    expect(document.activeElement?.id).toBe("trigger");
    wrapper.unmount();
  });
});
