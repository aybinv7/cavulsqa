import { mount } from "@vue/test-utils";
import { afterEach, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import * as entry from "../src/index.js";
import { COMPONENT_NAMES } from "../src/componentNames.js";
import { M3eResolver } from "../src/resolver.js";
import {
  M3ListItem,
  M3BottomSheet,
  M3Button,
  M3NavigationBar,
  M3NavigationItem,
  M3Switch,
  M3Tab,
  M3Tabs,
  createM3e,
} from "../src/index.js";

afterEach(() => {
  document.body.innerHTML = "";
});

test("every exported component is known to the resolver, and nothing else is", () => {
  const exported = Object.keys(entry)
    .filter((name) => /^M3[A-Z][a-z]/.test(name))
    .sort();
  expect([...COMPONENT_NAMES].sort()).toEqual(exported);
  const resolver = M3eResolver();
  expect(resolver.resolve("M3Button")).toEqual({ name: "M3Button", from: "@cavulsqa/m3e-vue" });
  expect(resolver.resolve("F7Button")).toBeUndefined();
});

test("a toggle button flips its selection and reports it", async () => {
  const wrapper = mount(M3Button, {
    props: { toggle: true, selected: false },
    slots: { default: "Bold" },
  });
  await wrapper.trigger("click");
  expect(wrapper.emitted("update:selected")?.[0]).toEqual([true]);
  const selected = mount(M3Button, {
    props: { toggle: true, selected: true },
    slots: { default: "Bold" },
  });
  expect(selected.attributes("aria-pressed")).toBe("true");
  expect(selected.classes()).toContain("m3-button--selected");
});

test("a disabled button does not emit", async () => {
  const wrapper = mount(M3Button, { props: { disabled: true }, slots: { default: "Send" } });
  await wrapper.trigger("click");
  expect(wrapper.emitted("click")).toBeUndefined();
});

test("a press marks the element so its shape can tighten", async () => {
  const wrapper = mount(M3Button, { slots: { default: "Go" } });
  await wrapper.trigger("pointerdown", { button: 0 });
  expect(wrapper.attributes("data-pressed")).toBe("");
  await wrapper.trigger("pointerup");
  expect(wrapper.attributes("data-pressed")).toBeUndefined();
});

test("a switch toggles and exposes its state", async () => {
  const wrapper = mount(M3Switch, { props: { modelValue: false, label: "Wi-Fi" } });
  expect(wrapper.attributes("role")).toBe("switch");
  await wrapper.trigger("click");
  expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
});

test("the navigation bar selects the tapped destination", async () => {
  const Host = defineComponent({
    setup() {
      const active = ref("home");
      return () =>
        h(
          M3NavigationBar,
          {
            modelValue: active.value,
            "onUpdate:modelValue": (v?: string) => (active.value = v ?? active.value),
          },
          () => [
            h(M3NavigationItem, { value: "home", label: "Home" }),
            h(M3NavigationItem, { value: "orders", label: "Orders", badge: 3 }),
          ],
        );
    },
  });
  const wrapper = mount(Host);
  const items = wrapper.findAll(".m3-nav-item");
  expect(items[0]!.attributes("aria-current")).toBe("page");
  await items[1]!.trigger("click");
  expect(wrapper.findAll(".m3-nav-item")[1]!.attributes("aria-current")).toBe("page");
  expect(wrapper.find(".m3-nav-item__badge").text()).toBe("3");
});

test("arrow keys move between tabs", async () => {
  const Host = defineComponent({
    setup() {
      const tab = ref("a");
      return () =>
        h(
          M3Tabs,
          {
            modelValue: tab.value,
            "onUpdate:modelValue": (v?: string) => (tab.value = v ?? tab.value),
          },
          () => [h(M3Tab, { value: "a", label: "A" }), h(M3Tab, { value: "b", label: "B" })],
        );
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  const tabs = wrapper.findAll("[role=tab]");
  (tabs[0]!.element as HTMLElement).focus();
  await wrapper.find("[role=tablist]").trigger("keydown", { key: "ArrowRight" });
  expect(wrapper.findAll("[role=tab]")[1]!.attributes("aria-selected")).toBe("true");
  wrapper.unmount();
});

test("a sheet opens into the body and Android back closes it", async () => {
  const m3e = createM3e({ reducedMotion: true });
  const open = ref(false);
  const closed: string[] = [];
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          M3BottomSheet,
          {
            open: open.value,
            "onUpdate:open": (v: boolean) => (open.value = v),
            title: "Filters",
            onClosed: () => closed.push("closed"),
          },
          () => h("p", "Body"),
        );
    },
  });
  mount(Host, { global: { plugins: [m3e] }, attachTo: document.body });
  open.value = true;
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(
    document.body.querySelector("[role=dialog]")?.getAttribute("aria-labelledby"),
  ).toBeTruthy();
  expect(m3e.config.overlays.entries.value).toHaveLength(1);
  expect(m3e.config.overlays.closeTop()).toBe(true);
  expect(open.value).toBe(false);
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(closed).toEqual(["closed"]);
  expect(document.body.querySelector("[role=dialog]")).toBeNull();
  expect(m3e.config.overlays.entries.value).toHaveLength(0);
});

test("tapping the selected destination again emits reselect instead of selecting", async () => {
  const reselected: string[] = [];
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          M3NavigationBar,
          { modelValue: "home", onReselect: (v: string) => reselected.push(v) },
          () => [h(M3NavigationItem, { value: "home", label: "Home" })],
        );
    },
  });
  const wrapper = mount(Host);
  await wrapper.find(".m3-nav-item").trigger("click");
  expect(reselected).toEqual(["home"]);
});

test("a list item's action sits beside its tap target, never inside it", () => {
  const wrapper = mount(M3ListItem, {
    props: { headline: "Order", clickable: true },
    slots: { action: '<button type="button" class="more">More</button>' },
  });
  const surface = wrapper.find("button.m3-list-item__surface");
  expect(surface.exists()).toBe(true);
  expect(surface.find(".more").exists()).toBe(false);
  expect(wrapper.find(".m3-list-item__action .more").exists()).toBe(true);
});
