import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3ChipField, M3CodeField, M3TextField, createM3e } from "../src/index.js";
import { hasEntry, splitEntries } from "../src/utils/chipField.js";
import { sanitizeCode } from "../src/utils/codeField.js";

const plugins = [createM3e({ reducedMotion: true })];

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("sanitizeCode", () => {
  test("keeps what the alphabet allows, up to the length", () => {
    expect(sanitizeCode("Your code: 482 913", 6)).toBe("482913");
    expect(sanitizeCode("12345678", 6)).toBe("123456");
    expect(sanitizeCode("ab-12c", 4, "alphanumeric")).toBe("AB12");
  });

  test("reads Arabic-Indic and full-width digits as the digits they are", () => {
    expect(sanitizeCode("٤٨٢۹١٣", 6)).toBe("482913");
    expect(sanitizeCode("１２３", 6)).toBe("123");
  });
});

describe("splitEntries", () => {
  test("every separator ends an entry; the rest is still being typed", () => {
    expect(splitEntries("north, south, ea", [","])).toEqual({
      entries: ["north", "south"],
      rest: " ea",
    });
    expect(splitEntries("a;;b;", [",", ";"])).toEqual({ entries: ["a", "b"], rest: "" });
    expect(splitEntries("plain", ["Enter"])).toEqual({ entries: [], rest: "plain" });
    expect(hasEntry(["Oran"], " oran ")).toBe(true);
  });
});

describe("M3CodeField", () => {
  function field(initial = "") {
    const code = shallowRef(initial);
    const done: string[] = [];
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3CodeField, {
            label: "Verification code",
            modelValue: code.value,
            "onUpdate:modelValue": (value: string) => (code.value = value),
            onComplete: (value: string) => done.push(value),
          }),
      }),
      { global: { plugins }, attachTo: document.body },
    );
    return { wrapper, code, done };
  }

  test("a pasted message fills the cells and completes the code", async () => {
    const { wrapper, code, done } = field();
    const input = wrapper.get("input");
    expect(input.attributes("autocomplete")).toBe("one-time-code");
    expect(input.attributes("inputmode")).toBe("numeric");
    await input.setValue("Code: 482 913");
    expect(code.value).toBe("482913");
    expect(done).toEqual(["482913"]);
    expect(wrapper.findAll(".m3-code-field__cell--filled")).toHaveLength(6);
    expect(wrapper.findAll(".m3-code-field__cell--break")).toHaveLength(1);
    wrapper.unmount();
  });

  test("a character outside the alphabet is dropped from the input itself", async () => {
    const { wrapper, code } = field("12");
    const input = wrapper.get("input");
    await input.setValue("12a");
    expect(code.value).toBe("12");
    expect((input.element as HTMLInputElement).value).toBe("12");
    wrapper.unmount();
  });

  test("an error is announced and colours the row", async () => {
    const error = shallowRef<string | undefined>(undefined);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3CodeField, { label: "Code", modelValue: "111111", error: error.value }),
      }),
      { global: { plugins } },
    );
    error.value = "Wrong code";
    await nextTick();
    expect(wrapper.get("[role=alert]").text()).toBe("Wrong code");
    expect(wrapper.get(".m3-code-field").classes()).toContain("m3-code-field--error");
    expect(wrapper.get("input").attributes("aria-invalid")).toBe("true");
    wrapper.unmount();
  });
});

describe("M3ChipField", () => {
  function field(initial: string[] = [], extra: Record<string, unknown> = {}) {
    const tags = shallowRef(initial);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3ChipField, {
            label: "Tags",
            modelValue: tags.value,
            "onUpdate:modelValue": (value: string[]) => (tags.value = value),
            ...extra,
          }),
      }),
      { global: { plugins }, attachTo: document.body },
    );
    return { wrapper, tags, input: () => wrapper.get("input") };
  }

  test("separators and Enter turn text into chips", async () => {
    const { wrapper, tags, input } = field();
    await input().setValue("north, south, ea");
    expect(tags.value).toEqual(["north", "south"]);
    expect((input().element as HTMLInputElement).value).toBe(" ea");
    await input().trigger("keydown", { key: "Enter" });
    expect(tags.value).toEqual(["north", "south", "ea"]);
    expect(wrapper.findAll(".m3-chip-field__chip")).toHaveLength(3);
    wrapper.unmount();
  });

  test("backspace marks the last chip before removing it", async () => {
    const { wrapper, tags, input } = field(["a", "b"]);
    await input().trigger("keydown", { key: "Backspace" });
    expect(tags.value).toEqual(["a", "b"]);
    expect(wrapper.find(".m3-chip-field__chip--marked").text()).toContain("b");
    await input().trigger("keydown", { key: "Backspace" });
    expect(tags.value).toEqual(["a"]);
    wrapper.unmount();
  });

  test("a duplicate is not added, and a rejected entry stays in the input", async () => {
    const { wrapper, tags, input } = field(["Oran"], {
      validate: (value: string) => value.length >= 3,
    });
    await input().setValue("oran,");
    expect(tags.value).toEqual(["Oran"]);
    await input().setValue("ab,");
    expect(tags.value).toEqual(["Oran"]);
    expect((input().element as HTMLInputElement).value).toBe("ab");
    await nextTick();
    wrapper.unmount();
  });

  test("the limit is counted and holds", async () => {
    const { wrapper, tags, input } = field(["a"], { max: 2 });
    await input().setValue("b, c,");
    expect(tags.value).toEqual(["a", "b"]);
    expect(wrapper.get(".m3-chip-field__counter").text()).toBe("2/2");
    wrapper.unmount();
  });
});

describe("M3TextField as a controlled field", () => {
  test("the input shows what the model kept, not the keystroke", async () => {
    const digits = shallowRef("55");
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3TextField, {
            label: "Phone",
            modelValue: digits.value,
            "onUpdate:modelValue": (raw: string) => (digits.value = raw.replace(/\D/g, "")),
          }),
      }),
      { global: { plugins } },
    );
    const input = wrapper.get("input");
    await input.setValue("55a");
    await nextTick();
    expect(digits.value).toBe("55");
    expect((input.element as HTMLInputElement).value).toBe("55");
    await input.setValue("555");
    await nextTick();
    expect((input.element as HTMLInputElement).value).toBe("555");
    wrapper.unmount();
  });
});
