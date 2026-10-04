import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { h, nextTick, shallowRef } from "vue";
import { M3MessageBar, M3Messages, createM3e, type ChatMessage } from "../src/index.js";
import {
  conversationRows,
  dayLabel,
  hashPick,
  initials,
  isJumboEmoji,
} from "../src/utils/messages.js";

const plugins = [createM3e({ reducedMotion: true })];
const NOW = new Date(2026, 9, 4, 15, 0);
const at = (days: number, hour: number, minute = 0) =>
  new Date(2026, 9, 4 - days, hour, minute).toISOString();

function message(id: number, sent: boolean, when: string, extra: Partial<ChatMessage> = {}) {
  return {
    id,
    sent,
    at: when,
    text: `message ${id}`,
    author: sent ? undefined : "Amina",
    ...extra,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("conversation rows", () => {
  test("a divider opens each day and groups break on author, gap and day", () => {
    const rows = conversationRows(
      [
        message(1, false, at(1, 9, 0)),
        message(2, false, at(1, 9, 2)),
        message(3, false, at(1, 9, 20)),
        message(4, true, at(0, 10, 0)),
        message(5, false, at(0, 10, 1), { author: "Karim" }),
        message(6, false, at(0, 10, 2), { author: "Amina" }),
      ],
      { now: NOW, locale: "en" },
    );
    expect(rows.map((row) => (row.kind === "day" ? row.label : row.key))).toEqual([
      "Yesterday",
      1,
      2,
      3,
      "Today",
      4,
      5,
      6,
    ]);
    const flags = rows.flatMap((row) => (row.kind === "message" ? [[row.first, row.last]] : []));
    expect(flags).toEqual([
      [true, false],
      [false, true],
      [true, true],
      [true, true],
      [true, true],
      [true, true],
    ]);
  });

  test("only the newest sent message carries the delivery status", () => {
    const rows = conversationRows(
      [message(1, true, at(0, 9)), message(2, true, at(0, 9, 1)), message(3, false, at(0, 9, 2))],
      { now: NOW },
    );
    expect(rows.flatMap((row) => (row.kind === "message" ? [row.latestSent] : []))).toEqual([
      false,
      true,
      false,
    ]);
  });

  test("day labels go from relative, to the weekday, to the date with its year", () => {
    expect(dayLabel(new Date(2026, 9, 4, 1), NOW, "en")).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 3, 23), NOW, "fr")).toBe("Hier");
    expect(dayLabel(new Date(2026, 8, 30), NOW, "en")).toBe("Wednesday");
    expect(dayLabel(new Date(2026, 7, 1), NOW, "en")).toContain("August");
    expect(dayLabel(new Date(2025, 7, 1), NOW, "en")).toContain("2025");
  });

  test("one to three emoji alone count as jumbo, anything else does not", () => {
    expect(isJumboEmoji("😀")).toBe(true);
    expect(isJumboEmoji("👍🏽 🇩🇿")).toBe(true);
    expect(isJumboEmoji("❤️❤️❤️")).toBe(true);
    expect(isJumboEmoji("😀😀😀😀")).toBe(false);
    expect(isJumboEmoji("ok 😀")).toBe(false);
    expect(isJumboEmoji("123")).toBe(false);
    expect(isJumboEmoji("")).toBe(false);
  });

  test("initials take the first and last words and a name keeps its colour", () => {
    expect(initials("amina benali")).toBe("AB");
    expect(initials("Karim")).toBe("K");
    expect(initials("  ")).toBe("");
    expect(hashPick("Amina", 3)).toBe(hashPick("Amina", 3));
  });
});

describe("M3Messages", () => {
  test("statuses, retry, hold and the typing indicator", async () => {
    const messages = [
      message(1, true, at(0, 9), { status: "read" }),
      message(2, true, at(0, 9, 1), { status: "delivered" }),
      message(3, true, at(0, 9, 2), { status: "failed" }),
    ];
    const wrapper = mount(M3Messages, {
      props: { messages, label: "Amina", authors: true, typing: { author: "Amina" } },
      global: { plugins },
    });
    const rows = wrapper.findAll("[data-message-key]");
    expect(rows[0]!.text()).not.toContain("Read");
    expect(rows[2]!.find(".m3-chat-row__footer--retry").text()).toContain("Not sent");
    await rows[2]!.get(".m3-chat-row__footer--retry").trigger("click");
    expect(wrapper.emitted("retry")?.[0]?.[0]).toMatchObject({ id: 3 });
    await rows[0]!.get(".m3-chat-bubble").trigger("contextmenu");
    expect(wrapper.emitted("hold")?.[0]?.[0]).toMatchObject({ id: 1 });
    expect(wrapper.get("[role=status]").text()).toBe("Amina is typing");
    expect(wrapper.get("[role=log]").attributes("aria-label")).toBe("Amina");
  });

  test("a tap reveals a grouped message's time", async () => {
    const wrapper = mount(M3Messages, {
      props: {
        messages: [message(1, false, at(0, 9)), message(2, false, at(0, 9, 1))],
        label: "Amina",
      },
      global: { plugins },
    });
    const first = () => wrapper.findAll("[data-message-key]")[0]!;
    expect(first().find("time").exists()).toBe(false);
    await first().get(".m3-chat-bubble").trigger("click");
    expect(first().find("time").exists()).toBe(true);
  });
});

describe("conversation scrolling", () => {
  const ROW = 50;
  const VIEW = 300;

  function scroller() {
    const element = document.createElement("div");
    element.style.overflowY = "auto";
    document.body.append(element);
    let top = 0;
    let extra = 200;
    const rows = () => element.querySelectorAll("[data-message-key]").length;
    const max = () => Math.max(0, rows() * ROW + extra - VIEW);
    Object.defineProperties(element, {
      scrollHeight: { get: () => rows() * ROW + extra },
      clientHeight: { get: () => VIEW },
      scrollTop: {
        get: () => top,
        set: (value: number) => (top = Math.min(max(), Math.max(0, value))),
      },
    });
    element.scrollTo = ((options: ScrollToOptions) =>
      (element.scrollTop = options.top ?? 0)) as never;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        if (this === element) return new DOMRect(0, 0, 360, VIEW);
        if (this instanceof HTMLElement && this.dataset.messageKey !== undefined) {
          const index = [...element.querySelectorAll("[data-message-key]")].indexOf(this);
          return new DOMRect(0, 100 + index * ROW - top, 360, ROW);
        }
        return new DOMRect();
      },
    );
    const grow = (by: number) => (extra += by);
    return { element, max, grow };
  }

  const history = (from: number, to: number, sent = false) =>
    Array.from({ length: to - from + 1 }, (_, index) =>
      message(from + index, sent, at(0, 9, from + index)),
    );

  function conversation(element: HTMLElement, initial: ChatMessage[]) {
    const list = shallowRef(initial);
    const wrapper = mount(
      { render: () => h(M3Messages, { messages: list.value, label: "Amina" }) },
      { attachTo: element, global: { plugins } },
    );
    const show = async (next: ChatMessage[]) => {
      list.value = next;
      await nextTick();
    };
    return { wrapper, show };
  }

  test("opens at the end, keeps the reader's place, counts what arrives, returns on send", async () => {
    const { element, max } = scroller();
    const { wrapper, show } = conversation(element, history(10, 29));
    await nextTick();
    expect(element.scrollTop).toBe(max());

    element.scrollTop = 200;
    element.dispatchEvent(new Event("scrollend"));
    await show([...history(5, 9), ...history(10, 29)]);
    expect(element.scrollTop).toBe(200 + 5 * ROW);

    const reading = element.scrollTop;
    await show([...history(5, 29), ...history(30, 31)]);
    expect(element.scrollTop).toBe(reading);
    await flushPromises();
    expect(wrapper.get(".m3-messages__jump").text()).toBe("2 new messages");

    await show([...history(5, 31), message(32, true, at(0, 10))]);
    expect(element.scrollTop).toBe(max());
    await flushPromises();
    expect(wrapper.find(".m3-messages__jump--count").exists()).toBe(false);
    wrapper.unmount();
  });

  test("content growing below a reader at the end keeps them there", async () => {
    const { element, max, grow } = scroller();
    const { wrapper } = conversation(element, history(1, 12));
    await nextTick();
    const before = element.scrollTop;
    grow(96);
    element.dispatchEvent(new Event("scrollend"));
    expect(element.scrollTop).toBe(before + 96);
    expect(element.scrollTop).toBe(max());

    for (const step of [10, 20, 30, 60]) {
      element.scrollTop -= step;
      element.dispatchEvent(new Event("scrollend"));
    }
    grow(40);
    element.dispatchEvent(new Event("scrollend"));
    expect(element.scrollTop).toBe(max() - 160);
    wrapper.unmount();
  });

  test("a reader at the end follows new messages, and they animate in", async () => {
    const { element, max } = scroller();
    const { wrapper, show } = conversation(element, history(1, 12));
    await nextTick();
    await show(history(1, 13));
    expect(element.scrollTop).toBe(max());
    expect(wrapper.get('[data-message-key="13"]').classes()).toContain("m3-chat-row--fresh");
    expect(wrapper.get('[data-message-key="12"]').classes()).not.toContain("m3-chat-row--fresh");
    wrapper.unmount();
  });
});

describe("M3MessageBar", () => {
  test("sends the trimmed text, clears the field and keeps it focused", async () => {
    const wrapper = mount(M3MessageBar, {
      props: { label: "Message" },
      attachTo: document.body,
      global: { plugins },
    });
    const send = () => wrapper.get('button[aria-label="Send"]');
    expect(send().attributes("disabled")).toBeDefined();
    const field = wrapper.get("textarea");
    (field.element as HTMLTextAreaElement).focus();
    await field.setValue("  On my way  ");
    await send().trigger("click");
    expect(wrapper.emitted("send")).toEqual([["On my way"]]);
    expect((field.element as HTMLTextAreaElement).value).toBe("");
    expect(document.activeElement).toBe(field.element);
    wrapper.unmount();
  });

  test("Enter sends only when asked, never mid-composition or with Shift", async () => {
    const wrapper = mount(M3MessageBar, {
      props: { label: "Message", enterSends: true },
      global: { plugins },
    });
    const field = wrapper.get("textarea");
    await field.setValue("salam");
    await field.trigger("keydown", { key: "Enter", shiftKey: true });
    await field.trigger("keydown", { key: "Enter", isComposing: true });
    expect(wrapper.emitted("send")).toBeUndefined();
    await field.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("send")).toEqual([["salam"]]);
    expect(field.attributes("enterkeyhint")).toBe("send");
  });

  test("the idle slot stands in for send while the field is empty", async () => {
    const wrapper = mount(M3MessageBar, {
      props: { label: "Message" },
      slots: { idle: '<button class="voice">voice</button>' },
      global: { plugins },
    });
    expect(wrapper.find(".voice").exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Send"]').exists()).toBe(false);
    await wrapper.get("textarea").setValue("hi");
    expect(wrapper.find(".voice").exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Send"]').exists()).toBe(true);
  });

  test("publishes its height on its parent for the conversation to keep clear", async () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 72),
    );
    const wrapper = mount(M3MessageBar, {
      props: { label: "Message" },
      attachTo: document.body,
      global: { plugins },
    });
    const parent = wrapper.element.parentElement as HTMLElement;
    await nextTick();
    expect(parent.style.getPropertyValue("--m3-message-bar-height")).toBe("72px");
    wrapper.unmount();
    expect(parent.style.getPropertyValue("--m3-message-bar-height")).toBe("");
  });
});

describe("M3Messages windowing", () => {
  const thread = (count: number, from = 0) =>
    Array.from({ length: count }, (_, index) => ({
      id: `m${from + index}`,
      sent: (from + index) % 3 === 0,
      at: new Date(2026, 9, 4, 8, 0).getTime() + (from + index) * 60_000,
      text: `message ${from + index}`,
      author: (from + index) % 3 === 0 ? undefined : "Amina",
    }));

  function chat(initial: ChatMessage[], extra: Record<string, unknown> = {}) {
    const messages = shallowRef(initial);
    const wrapper = mount(
      {
        setup: () => () =>
          h(
            M3Messages,
            { messages: messages.value, label: "Team", windowSize: 50, ...extra },
            { before: () => h("div", { class: "older" }, "older") },
          ),
      },
      { global: { plugins }, attachTo: document.body },
    );
    return { wrapper, messages };
  }

  test("a long thread renders only its newest rows", async () => {
    const { wrapper } = chat(thread(2000));
    await nextTick();
    const bubbles = wrapper.findAll(".m3-chat-bubble");
    expect(bubbles.length).toBeGreaterThanOrEqual(50);
    expect(bubbles.length).toBeLessThanOrEqual(71);
    expect(bubbles.at(-1)!.text()).toContain("message 1999");
    expect(wrapper.find(".older").exists()).toBe(false);
    wrapper.unmount();
  });

  test("arrivals at the end keep the window bounded", async () => {
    const { wrapper, messages } = chat(thread(2000));
    await nextTick();
    for (let round = 0; round < 3; round++) {
      messages.value = [...messages.value, ...thread(15, 2000 + round * 15)];
      await nextTick();
    }
    const bubbles = wrapper.findAll(".m3-chat-bubble");
    expect(bubbles.at(-1)!.text()).toContain("message 2044");
    expect(bubbles.length).toBeLessThanOrEqual(91);
    wrapper.unmount();
  });

  test("a different conversation starts its own window", async () => {
    const { wrapper, messages } = chat(thread(2000));
    await nextTick();
    messages.value = thread(30, 5000);
    await nextTick();
    expect(wrapper.findAll(".m3-chat-bubble")).toHaveLength(30);
    expect(wrapper.find(".older").exists()).toBe(true);
    wrapper.unmount();
  });

  test("a short thread renders whole, with its history slot", async () => {
    const { wrapper } = chat(thread(20));
    await nextTick();
    expect(wrapper.findAll(".m3-chat-bubble")).toHaveLength(20);
    expect(wrapper.find(".older").exists()).toBe(true);
    wrapper.unmount();
  });
});
