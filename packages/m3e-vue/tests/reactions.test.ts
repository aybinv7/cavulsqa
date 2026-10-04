import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, markRaw, shallowRef } from "vue";
import {
  M3AttachSheet,
  M3Messages,
  applyReaction,
  createM3e,
  ownReaction,
  reactionPeople,
  reactionTotal,
  type ChatMessage,
} from "../src/index.js";
import { alignBeside, liftPlacement } from "../src/utils/messageLift.js";

const plugins = [createM3e({ reducedMotion: true })];
const Icon = markRaw(defineComponent({ render: () => h("svg") }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("applyReaction", () => {
  test("adds the owner's reaction, or joins one others chose", () => {
    expect(applyReaction(undefined, "👍", 1)).toEqual([
      { emoji: "👍", count: 1, mine: true, at: 1 },
    ]);
    expect(applyReaction([{ emoji: "👍", count: 2 }], "👍", 5)).toEqual([
      { emoji: "👍", count: 3, mine: true, at: 5 },
    ]);
  });

  test("moves the owner's reaction rather than adding a second", () => {
    const before = [
      { emoji: "👍", count: 2, mine: true },
      { emoji: "❤️", count: 1 },
    ];
    expect(applyReaction(before, "❤️", 9)).toEqual([
      { emoji: "👍", count: 1, mine: false },
      { emoji: "❤️", count: 2, mine: true, at: 9 },
    ]);
  });

  test("null takes it off, and a reaction nobody else chose goes", () => {
    expect(applyReaction([{ emoji: "😂", mine: true }], null)).toEqual([]);
    expect(ownReaction([{ emoji: "😂" }, { emoji: "🔥", mine: true }])).toBe("🔥");
    expect(reactionTotal([{ emoji: "😂", count: 3 }, { emoji: "🔥" }])).toBe(4);
  });
});

describe("liftPlacement", () => {
  const sizes = { pill: 54, menu: 160, gap: 8 };
  const bounds = { top: 40, bottom: 800 };

  test("a bubble with room for both stays where it was pressed", () => {
    expect(liftPlacement({ top: 300, height: 60 }, sizes, bounds)).toMatchObject({
      top: 300,
      shift: 0,
      height: 60,
      pillTop: 238,
      menuTop: 368,
    });
  });

  test("one under the app bar moves down, one near the keyboard moves up", () => {
    expect(liftPlacement({ top: 50, height: 60 }, sizes, bounds).top).toBe(102);
    expect(liftPlacement({ top: 700, height: 60 }, sizes, bounds)).toMatchObject({
      top: 572,
      shift: -128,
      menuTop: 640,
    });
  });

  test("one taller than the room keeps its top and is cut short above the menu", () => {
    expect(liftPlacement({ top: 0, height: 900 }, sizes, bounds)).toMatchObject({
      top: 102,
      height: 530,
      menuTop: 640,
    });
  });
});

describe("alignBeside", () => {
  const bubble = { left: 60, right: 310 };

  test("lines up with the bubble's side when there is room", () => {
    expect(alignBeside(bubble, 200, 360, true, 12)).toBe(110);
    expect(alignBeside(bubble, 200, 360, false, 12)).toBe(60);
  });

  test("slides inward rather than off either edge", () => {
    expect(alignBeside(bubble, 320, 360, true, 12)).toBe(12);
    expect(alignBeside({ left: 120, right: 340 }, 300, 360, false, 12)).toBe(48);
  });
});

describe("message reactions", () => {
  function conversation(extra: Partial<ChatMessage> = {}) {
    const messages = shallowRef<ChatMessage[]>([
      { id: 1, sent: false, author: "Amina", at: Date.now(), text: "Route done", ...extra },
    ]);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3Messages, {
            messages: messages.value,
            label: "Team",
            reactions: ["👍", "❤️", "😂"],
            actions: [
              { id: "copy", label: "Copy", icon: Icon },
              {
                id: "delete",
                label: "Delete",
                tone: "destructive" as const,
                when: (m: ChatMessage) => m.sent,
              },
            ],
            onReact: (message: ChatMessage, emoji: string | null) => {
              messages.value = messages.value.map((entry) =>
                entry.id === message.id
                  ? { ...entry, reactions: applyReaction(entry.reactions, emoji) }
                  : entry,
              );
            },
          }),
      }),
      { global: { plugins }, attachTo: document.body },
    );
    return { wrapper, messages };
  }

  test("reactions sit on the bubble with their count in its label", () => {
    const { wrapper } = conversation({
      reactions: [
        { emoji: "👍", count: 2 },
        { emoji: "❤️", mine: true },
      ],
    });
    const group = wrapper.get(".m3-chat-reactions");
    expect(group.attributes("aria-label")).toBe("👍 2, ❤️");
    expect(group.findAll(".m3-chat-reactions__badge")).toHaveLength(2);
    expect(group.get(".m3-chat-reactions__count").text()).toBe("3");
    expect(group.find(".m3-chat-reactions__badge--mine").exists()).toBe(true);
    wrapper.unmount();
  });

  test("a long-press lifts the bubble with reactions above and actions below", async () => {
    const { wrapper, messages } = conversation();
    await wrapper.get(".m3-chat-bubble").trigger("contextmenu");
    await flushPromises();
    const layer = document.body.querySelector(".m3-chat-lift");
    expect(layer).not.toBeNull();
    expect(wrapper.findComponent(M3Messages).emitted("hold")).toBeUndefined();
    expect(layer!.querySelector(".m3-chat-lift__ghost .m3-chat-bubble")).not.toBeNull();
    const items = [...layer!.querySelectorAll(".m3-chat-lift__item")].map((item) =>
      item.textContent?.trim(),
    );
    expect(items).toEqual(["Copy"]);
    layer!.querySelectorAll<HTMLButtonElement>(".m3-chat-lift__emoji")[1]!.click();
    await flushPromises();
    expect(messages.value[0]!.reactions).toMatchObject([{ emoji: "❤️", mine: true, count: 1 }]);
    expect(document.body.querySelector(".m3-chat-lift")).toBeNull();
    wrapper.unmount();
  });

  test("choosing the reaction already there takes it off", async () => {
    const { wrapper, messages } = conversation({ reactions: [{ emoji: "😂", mine: true }] });
    await wrapper.get(".m3-chat-bubble").trigger("contextmenu");
    await flushPromises();
    const chosen = document.body.querySelector<HTMLButtonElement>("[aria-checked='true']");
    expect(chosen?.textContent?.trim()).toBe("😂");
    chosen!.click();
    await flushPromises();
    expect(messages.value[0]!.reactions).toEqual([]);
    wrapper.unmount();
  });

  test("without reactions or actions a long-press still emits hold", async () => {
    const wrapper = mount(M3Messages, {
      props: { messages: [{ id: 1, sent: true, at: Date.now(), text: "hi" }], label: "Team" },
      global: { plugins },
    });
    await wrapper.get(".m3-chat-bubble").trigger("contextmenu");
    expect(wrapper.emitted("hold")).toHaveLength(1);
    wrapper.unmount();
  });
});

describe("M3AttachSheet", () => {
  test("lists each option and closes as it reports the choice", async () => {
    const open = shallowRef(true);
    const chosen: string[] = [];
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3AttachSheet, {
            open: open.value,
            "onUpdate:open": (value: boolean) => (open.value = value),
            label: "Attach",
            options: [
              { id: "gallery", label: "Gallery", icon: Icon },
              { id: "camera", label: "Camera", icon: Icon, tone: "tertiary" as const },
            ],
            onSelect: (id: string) => chosen.push(id),
          }),
      }),
      { global: { plugins }, attachTo: document.body },
    );
    await flushPromises();
    const options = [
      ...document.body.querySelectorAll<HTMLButtonElement>(".m3-attach-sheet__option"),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual(["Gallery", "Camera"]);
    expect(options[1]!.className).toContain("m3-attach-sheet__option--tertiary");
    options[1]!.click();
    await flushPromises();
    expect(chosen).toEqual(["camera"]);
    expect(open.value).toBe(false);
    wrapper.unmount();
  });
});

describe("who reacted", () => {
  test("rows put the owner first, then named people, then the unnamed rest", () => {
    expect(
      reactionPeople([
        { emoji: "👍", count: 3, mine: true, by: ["Amina"] },
        { emoji: "❤️", count: 2, by: ["Karim"] },
      ]),
    ).toEqual([
      { emoji: "👍", mine: true },
      { emoji: "👍", mine: false, name: "Amina" },
      { emoji: "👍", mine: false, others: 1 },
      { emoji: "❤️", mine: false, name: "Karim" },
      { emoji: "❤️", mine: false, others: 1 },
    ]);
  });

  test("tapping the reactions lists who reacted; the owner's row takes theirs off", async () => {
    const messages = shallowRef<ChatMessage[]>([
      {
        id: 1,
        sent: false,
        author: "Amina",
        at: Date.now() - 60_000,
        text: "Route done",
        reactions: [
          { emoji: "👍", count: 2, mine: true, by: ["Karim"] },
          { emoji: "❤️", count: 1, by: ["Samir"] },
        ],
      },
    ]);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3Messages, {
            messages: messages.value,
            label: "Team",
            onReact: (message: ChatMessage, emoji: string | null) => {
              messages.value = messages.value.map((entry) =>
                entry.id === message.id
                  ? { ...entry, reactions: applyReaction(entry.reactions, emoji) }
                  : entry,
              );
            },
          }),
      }),
      { global: { plugins }, attachTo: document.body },
    );
    await wrapper.get("button.m3-chat-reactions").trigger("click");
    await flushPromises();
    const sheet = () => document.body.querySelector(".m3-chat-reactions-sheet");
    expect(sheet()).not.toBeNull();
    const rows = () =>
      [...sheet()!.querySelectorAll(".m3-list-item")].map((row) => row.textContent?.trim() ?? "");
    expect(rows()).toHaveLength(3);
    expect(rows()[0]).toContain("You");
    expect(rows()[1]).toContain("Karim");
    expect(rows()[2]).toContain("Samir");
    const heart = [
      ...sheet()!.querySelectorAll<HTMLButtonElement>(".m3-chip button, button.m3-chip"),
    ].find((chip) => chip.textContent?.includes("❤️"));
    heart!.click();
    await flushPromises();
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain("Samir");
    expect(wrapper.findComponent(M3Messages).emitted("hold")).toBeUndefined();
    wrapper.unmount();
  });

  test("the owner's row removes their reaction", async () => {
    const messages = shallowRef<ChatMessage[]>([
      {
        id: 1,
        sent: false,
        author: "Amina",
        at: Date.now() - 60_000,
        text: "Route done",
        reactions: [{ emoji: "👍", count: 2, mine: true, by: ["Karim"] }],
      },
    ]);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3Messages, {
            messages: messages.value,
            label: "Team",
            onReact: (message: ChatMessage, emoji: string | null) => {
              messages.value = messages.value.map((entry) =>
                entry.id === message.id
                  ? { ...entry, reactions: applyReaction(entry.reactions, emoji) }
                  : entry,
              );
            },
          }),
      }),
      { global: { plugins }, attachTo: document.body },
    );
    await wrapper.get("button.m3-chat-reactions").trigger("click");
    await flushPromises();
    const mine = document.body.querySelector<HTMLElement>(
      ".m3-chat-reactions-sheet .m3-list-item [role=button], .m3-chat-reactions-sheet .m3-list-item button",
    );
    (mine ??
      document.body.querySelector<HTMLElement>(".m3-chat-reactions-sheet .m3-list-item"))!.click();
    await flushPromises();
    expect(messages.value[0]!.reactions).toEqual([
      { emoji: "👍", count: 1, mine: false, by: ["Karim"] },
    ]);
    wrapper.unmount();
  });
});
