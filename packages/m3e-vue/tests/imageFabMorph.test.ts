import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3FabMorph, M3Image, createM3e } from "../src/index.js";

const plugins = [createM3e({ reducedMotion: true })];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("M3Image", () => {
  test("reserves its space, loads lazily and fades in once loaded", async () => {
    const wrapper = mount(M3Image, {
      props: { src: "/shelf.jpg", alt: "Shelf", width: 400, height: 300, placeholder: "#ddd" },
    });
    const root = wrapper.element as HTMLElement;
    expect(root.style.aspectRatio).toBe("400 / 300");
    expect(root.style.backgroundColor).not.toBe("");
    const img = wrapper.get("img");
    expect(img.attributes("loading")).toBe("lazy");
    expect(wrapper.classes()).toContain("m3-image--loading");
    await img.trigger("load");
    expect(wrapper.classes()).toContain("m3-image--loaded");
    expect(wrapper.emitted("load")).toHaveLength(1);
  });

  test("a failure keeps the alt text and a new source tries again", async () => {
    const src = shallowRef("/missing.jpg");
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(M3Image, { src: src.value, alt: "Shelf", eager: true }),
      }),
    );
    expect(wrapper.get("img").attributes("loading")).toBe("eager");
    await wrapper.get("img").trigger("error");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.get("[role=img]").attributes("aria-label")).toBe("Shelf");
    src.value = "/shelf.jpg";
    await nextTick();
    expect(wrapper.find("img").exists()).toBe(true);
  });

  test("a tiny image placeholder is drawn blurred behind", () => {
    const wrapper = mount(M3Image, {
      props: { src: "/a.jpg", alt: "", placeholder: "data:image/png;base64,AAAA" },
    });
    expect(wrapper.classes()).toContain("m3-image--pictured");
  });
});

describe("M3FabMorph", () => {
  function harness(variant: "toolbar" | "panel") {
    const open = shallowRef(false);
    const wrapper = mount(
      defineComponent({
        setup: () => () => [
          h("button", { id: "elsewhere" }),
          h(
            M3FabMorph,
            {
              label: "Quick actions",
              variant,
              open: open.value,
              "onUpdate:open": (value: boolean) => (open.value = value),
            },
            {
              default: ({ close }: { close: () => void }) =>
                h("button", { id: "act", onClick: close }, "Call"),
            },
          ),
        ],
      }),
      { attachTo: document.body, global: { plugins } },
    );
    return { wrapper, open };
  }

  test("the FAB opens a labelled toolbar, focus moves in, and an action can close it", async () => {
    const { wrapper, open } = harness("toolbar");
    const fab = wrapper.get(".m3-fab");
    expect(fab.attributes("aria-expanded")).toBe("false");
    await fab.trigger("click");
    await nextTick();
    await nextTick();
    const surface = wrapper.get(".m3-fab-morph__surface");
    expect(surface.attributes("role")).toBe("toolbar");
    expect(fab.attributes("aria-controls")).toBe(surface.attributes("id"));
    expect(document.activeElement?.id).toBe("act");
    expect(wrapper.find(".m3-fab-morph__scrim").exists()).toBe(false);
    await wrapper.get("#act").trigger("click");
    await nextTick();
    await nextTick();
    expect(open.value).toBe(false);
    expect(wrapper.find(".m3-fab-morph__surface").exists()).toBe(false);
    await nextTick();
    expect(document.activeElement).toBe(fab.element);
    wrapper.unmount();
  });

  test("a panel has a scrim and closes on a tap outside or Escape", async () => {
    const { wrapper, open } = harness("panel");
    open.value = true;
    await nextTick();
    await nextTick();
    expect(wrapper.get(".m3-fab-morph__surface").attributes("role")).toBe("dialog");
    expect(wrapper.find(".m3-fab-morph__scrim").exists()).toBe(true);
    document
      .getElementById("elsewhere")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(open.value).toBe(false);
    open.value = true;
    await nextTick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(open.value).toBe(false);
    wrapper.unmount();
  });
});
