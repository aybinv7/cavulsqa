import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import {
  M3Breadcrumbs,
  M3ColorPicker,
  M3TextEditor,
  createM3e,
  isSafeHref,
  sanitizeHtml,
} from "../src/index.js";

const plugins = [createM3e({ reducedMotion: true })];

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("sanitizeHtml", () => {
  test("keeps the editor's formatting and drops every attribute but a link's address", () => {
    expect(sanitizeHtml('<p style="color:red" class="x">Hi <b onclick="x()">there</b></p>')).toBe(
      "<p>Hi <b>there</b></p>",
    );
    expect(sanitizeHtml("<ul><li><i>one</i></li><li><u>two</u></li></ul>")).toBe(
      "<ul><li><i>one</i></li><li><u>two</u></li></ul>",
    );
    expect(sanitizeHtml("<div>line</div><strong>s</strong><em>e</em><strike>x</strike>")).toBe(
      "<p>line</p><b>s</b><i>e</i><s>x</s>",
    );
  });

  test("scripts, handlers, frames and dangerous links never survive", () => {
    const hostile = [
      '<img src=x onerror="alert(1)">',
      "<script>alert(1)</script>",
      '<svg onload="alert(1)"><circle/></svg>',
      '<iframe name="frame"></iframe>',
      '<a href="javascript:alert(1)">click</a>',
      '<a href=" JaVaScRiPt:alert(1)">click</a>',
      '<a href="data:text/html,<script>alert(1)</script>">x</a>',
      "<style>body{display:none}</style>",
    ].join("");
    const clean = sanitizeHtml(hostile);
    expect(clean).not.toMatch(/script|onerror|onload|iframe|javascript|data:|style|<img|<svg/i);
    expect(clean).toBe("clickclickx");
  });

  test("safe links open in a new context without a referrer; unknown wrappers keep their text", () => {
    expect(sanitizeHtml('<a href="https://sig.dz/x" target="_self">site</a>')).toBe(
      '<a href="https://sig.dz/x" rel="noopener noreferrer nofollow" target="_blank">site</a>',
    );
    expect(sanitizeHtml("<span><font>kept</font></span>")).toBe("kept");
    expect(isSafeHref("mailto:a@b.dz")).toBe(true);
    expect(isSafeHref("tel:+213555")).toBe(true);
    expect(isSafeHref("vbscript:x")).toBe(false);
  });
});

describe("M3Breadcrumbs", () => {
  const path = (n: number) =>
    Array.from({ length: n }, (_, index) => ({ label: `Level ${index + 1}` }));

  test("the last level is the current page and the others go back up", async () => {
    const wrapper = mount(M3Breadcrumbs, { props: { items: path(3), label: "Catalogue" } });
    expect(wrapper.get("nav").attributes("aria-label")).toBe("Catalogue");
    expect(wrapper.get("[aria-current=page]").text()).toBe("Level 3");
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("select")?.[0]?.[1]).toBe(1);
  });

  test("past max the middle collapses into a menu of the hidden levels", async () => {
    const wrapper = mount(M3Breadcrumbs, {
      props: { items: path(7), max: 4, moreLabel: "More levels" },
      attachTo: document.body,
      global: { plugins },
    });
    const shown = wrapper.findAll("li").map((item) => item.text());
    expect(shown).toEqual(["Level 1", "…", "Level 5", "Level 6", "Level 7"]);
    await wrapper.get('[aria-label="More levels"]').trigger("click");
    await nextTick();
    const hidden = [...document.querySelectorAll("[role=menuitem]")].map((item) =>
      item.textContent?.trim(),
    );
    expect(hidden).toEqual(["Level 2", "Level 3", "Level 4"]);
    wrapper.unmount();
  });
});

describe("M3ColorPicker", () => {
  function picker(start = "#6750a4") {
    const value = shallowRef(start);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3ColorPicker, {
            modelValue: value.value,
            "onUpdate:modelValue": (next: string) => (value.value = next),
            swatches: ["#b3261e", "#006a6a"],
          }),
      }),
      { global: { plugins } },
    );
    return { wrapper, value };
  }

  test("reads the model into hue, chroma and tone sliders", () => {
    const { wrapper } = picker();
    const sliders = wrapper.findAll("[role=slider]");
    expect(sliders.map((slider) => slider.attributes("aria-label"))).toEqual([
      "Hue",
      "Chroma",
      "Tone",
    ]);
    expect(Number(sliders[2]!.attributes("aria-valuenow"))).toBeGreaterThan(30);
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("6750a4");
  });

  test("a tone key press darkens the colour but keeps its hue", async () => {
    const { wrapper, value } = picker();
    const hue = wrapper.findAll("[role=slider]")[0]!.attributes("aria-valuenow");
    await wrapper.findAll("[role=slider]")[2]!.trigger("keydown", { key: "PageDown" });
    expect(value.value).not.toBe("#6750a4");
    expect(value.value).toMatch(/^#[0-9a-f]{6}$/);
    expect(wrapper.findAll("[role=slider]")[0]!.attributes("aria-valuenow")).toBe(hue);
  });

  test("a hex entry and a swatch set the colour; a bad entry is reported", async () => {
    const { wrapper, value } = picker();
    const input = wrapper.get("input");
    await input.setValue("0af");
    await input.trigger("change");
    expect(value.value).toBe("#00aaff");
    await input.setValue("zz");
    await input.trigger("change");
    expect(wrapper.text()).toContain("Enter 3 or 6 hex digits");
    expect(value.value).toBe("#00aaff");
    await wrapper.findAll("[role=radio]")[1]!.trigger("click");
    expect(value.value).toBe("#006a6a");
    expect(wrapper.findAll("[role=radio]")[1]!.attributes("aria-checked")).toBe("true");
  });
});

describe("M3TextEditor", () => {
  function editor(start: string) {
    const value = shallowRef(start);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3TextEditor, {
            label: "Visit report",
            placeholder: "What happened",
            modelValue: value.value,
            "onUpdate:modelValue": (next: string) => (value.value = next),
          }),
      }),
      { attachTo: document.body, global: { plugins } },
    );
    const content = wrapper.get("[role=textbox]");
    return { wrapper, value, content };
  }

  test("renders the model sanitised and shows the placeholder when empty", async () => {
    const { wrapper, content } = editor("<p>Shelf <b>full</b></p><script>alert(1)</script>");
    await nextTick();
    expect(content.element.innerHTML).toBe("<p>Shelf <b>full</b></p>");
    expect(content.classes()).not.toContain("m3-text-editor__content--empty");
    const blank = editor("");
    await nextTick();
    expect(blank.content.classes()).toContain("m3-text-editor__content--empty");
    expect(blank.content.attributes("aria-placeholder")).toBe("What happened");
    wrapper.unmount();
    blank.wrapper.unmount();
  });

  test("typing emits sanitised HTML, and an emptied editor emits nothing", async () => {
    const { wrapper, value, content } = editor("");
    await nextTick();
    content.element.innerHTML = '<p onclick="x()">Visited <i>twice</i></p>';
    await content.trigger("input");
    expect(value.value).toBe("<p>Visited <i>twice</i></p>");
    content.element.innerHTML = "<p><br></p>";
    await content.trigger("input");
    expect(value.value).toBe("");
    wrapper.unmount();
  });

  test("paste goes in sanitised, and dropping is refused", async () => {
    const insert = vi.fn();
    Object.defineProperty(document, "execCommand", { value: insert, configurable: true });
    const { wrapper, content } = editor("");
    await nextTick();
    const paste = new Event("paste", { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(paste, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html" ? '<b>ok</b><img src=x onerror="x()">' : "ok",
      },
    });
    content.element.dispatchEvent(paste);
    expect(paste.defaultPrevented).toBe(true);
    expect(insert).toHaveBeenCalledWith("insertHTML", false, "<b>ok</b>");
    const drop = new Event("drop", { cancelable: true });
    content.element.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    wrapper.unmount();
  });

  test("the toolbar names every command and keeps focus in the text", async () => {
    const { wrapper } = editor("");
    const buttons = wrapper.findAll("[role=toolbar] button");
    expect(buttons.map((button) => button.attributes("aria-label"))).toEqual([
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Bulleted list",
      "Numbered list",
      "Link",
      "Clear formatting",
    ]);
    const down = new Event("pointerdown", { cancelable: true, bubbles: true });
    buttons[0]!.element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    await buttons[6]!.trigger("click");
    expect(buttons[6]!.attributes("aria-pressed")).toBe("false");
    const form = document.querySelector<HTMLFormElement>(".m3-text-editor__link");
    expect(form?.noValidate).toBe(true);
    wrapper.unmount();
  });
});
