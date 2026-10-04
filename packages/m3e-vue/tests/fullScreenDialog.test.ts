import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3FullScreenDialog, createM3e } from "../src/index.js";

describe("M3FullScreenDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountDialog(dismissible = true) {
    const open = ref(true);
    const events: string[] = [];
    mount(
      defineComponent({
        setup: () => () =>
          h(
            M3FullScreenDialog,
            {
              title: "New order",
              confirmLabel: "Save",
              dismissible,
              open: open.value,
              "onUpdate:open": (value: boolean) => (open.value = value),
              onConfirm: () => events.push("confirm"),
              onClose: () => events.push("close"),
            },
            () => h("p", "Order lines"),
          ),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return { open, events };
  }

  test("names itself by its title and confirms through the text action", async () => {
    const { events } = mountDialog();
    await nextTick();
    const dialog = document.body.querySelector("[role=dialog]")!;
    const title = dialog.querySelector("h2")!;
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    expect(title.textContent).toBe("New order");
    const save = [...dialog.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Save",
    )!;
    save.click();
    expect(events).toEqual(["confirm"]);
  });

  test("the close icon closes it", async () => {
    const { open, events } = mountDialog();
    await nextTick();
    document.body.querySelector<HTMLButtonElement>("[aria-label=Close]")!.click();
    expect(open.value).toBe(false);
    expect(events).toEqual(["close"]);
  });

  test("a dirty form holds it open and still hears the close", async () => {
    const { open, events } = mountDialog(false);
    await nextTick();
    document.body.querySelector<HTMLButtonElement>("[aria-label=Close]")!.click();
    expect(open.value).toBe(true);
    expect(events).toEqual(["close"]);
  });
});

describe("overlay stacking", async () => {
  const { M3Dialog } = await import("../src/index.js");

  test("an overlay opened from another draws above it, whatever the document order", async () => {
    const outer = ref(false);
    const inner = ref(false);
    mount(
      defineComponent({
        setup: () => () => [
          h(M3Dialog, { open: inner.value, headline: "Discard?" }),
          h(M3FullScreenDialog, { open: outer.value, title: "New order" }),
        ],
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    outer.value = true;
    await nextTick();
    inner.value = true;
    await nextTick();
    const z = (selector: string) =>
      Number(
        document.body
          .querySelector<HTMLElement>(selector)!
          .style.getPropertyValue("--m3-overlay-z"),
      );
    expect(z(".m3-dialog-layer")).toBeGreaterThan(z(".m3-fullscreen-dialog-layer"));
    document.body.innerHTML = "";
  });
});
