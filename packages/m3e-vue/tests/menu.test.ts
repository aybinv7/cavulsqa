import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3Menu, M3MenuItem, createM3e } from "../src/index.js";
import { placeSubmenu } from "../src/utils/menuPlacement.js";

const viewport = { width: 412, height: 900 };
const size = { width: 200, height: 240 };

describe("submenu placement", () => {
  test("opens at the item's end, tops aligned, when it fits", () => {
    const item = { left: 20, top: 100, right: 180, bottom: 144 };
    expect(placeSubmenu(item, size, viewport)).toEqual({ left: 180, top: 100 });
  });

  test("flips to the item's start when the end side is too narrow", () => {
    const item = { left: 220, top: 100, right: 400, bottom: 144 };
    expect(placeSubmenu(item, size, viewport)).toEqual({ left: 20, top: 100 });
  });

  test("sits flush with the window's end edge when neither side fits", () => {
    const item = { left: 100, top: 100, right: 312, bottom: 144 };
    expect(placeSubmenu(item, size, viewport).left).toBe(204);
  });

  test("aligns bottoms near the window's foot", () => {
    const item = { left: 20, top: 800, right: 180, bottom: 844 };
    expect(placeSubmenu(item, size, viewport).top).toBe(604);
  });

  test("keeps the gap from the item's surface on either side", () => {
    const item = { left: 20, top: 100, right: 180, bottom: 144 };
    expect(placeSubmenu(item, size, viewport, false, 2).left).toBe(182);
    expect(placeSubmenu({ ...item, left: 210, right: 404 }, size, viewport, false, 2).left).toBe(8);
  });

  test("mirrors in right-to-left", () => {
    const item = { left: 232, top: 100, right: 392, bottom: 144 };
    expect(placeSubmenu(item, size, viewport, true)).toEqual({ left: 32, top: 100 });
  });
});

describe("M3Menu cascade", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountMenu() {
    const open = ref(true);
    const chosen: string[] = [];
    const wrapper = mount(
      defineComponent({
        setup: () => () => [
          h("button", { id: "anchor" }, "More"),
          h(
            M3Menu,
            {
              anchor: document.getElementById("anchor"),
              open: open.value,
              "onUpdate:open": (value: boolean) => (open.value = value),
            },
            () => [
              h(M3MenuItem, { label: "Copy", onSelect: () => chosen.push("copy") }),
              h(
                M3MenuItem,
                { label: "Share", class: "share" },
                {
                  submenu: () => [
                    h(M3MenuItem, { label: "Email", onSelect: () => chosen.push("email") }),
                    h(M3MenuItem, { label: "Link", onSelect: () => chosen.push("link") }),
                  ],
                },
              ),
            ],
          ),
        ],
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { wrapper, open, chosen };
  }

  const menus = () => document.body.querySelectorAll<HTMLElement>(".m3-menu");
  const item = (label: string) =>
    [...document.body.querySelectorAll<HTMLElement>("[role=menuitem]")].find(
      (node) => node.querySelector(".m3-menu-item__label")?.textContent === label,
    )!;

  test("a cascading item announces its submenu and opens it on tap", async () => {
    mountMenu();
    await nextTick();
    const share = item("Share");
    expect(share.getAttribute("aria-haspopup")).toBe("menu");
    expect(share.getAttribute("aria-expanded")).toBe("false");
    share.click();
    await nextTick();
    await nextTick();
    expect(menus()).toHaveLength(2);
    expect(share.getAttribute("aria-expanded")).toBe("true");
  });

  test("choosing an item in the submenu closes the whole chain", async () => {
    const { open, chosen } = mountMenu();
    await nextTick();
    item("Share").click();
    await nextTick();
    await nextTick();
    item("Email").click();
    await nextTick();
    expect(chosen).toEqual(["email"]);
    expect(open.value).toBe(false);
  });

  test("the arrow toward the parent closes only the submenu", async () => {
    const { open } = mountMenu();
    await nextTick();
    item("Share").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(menus()).toHaveLength(2);
    menus()[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(menus()).toHaveLength(1);
    expect(open.value).toBe(true);
  });

  test("closing the parent closes its open submenu", async () => {
    const { open } = mountMenu();
    await nextTick();
    item("Share").click();
    await nextTick();
    await nextTick();
    open.value = false;
    await nextTick();
    await nextTick();
    expect(menus()).toHaveLength(0);
  });
});
