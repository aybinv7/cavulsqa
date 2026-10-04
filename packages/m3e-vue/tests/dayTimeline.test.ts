import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3Calendar, M3DayTimeline, createM3e } from "../src/index.js";
import { clockMinutes, layoutEvents, type TimelineEvent } from "../src/utils/dayTimeline.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const event = (id: string, start: number, end: number): TimelineEvent => ({ id, start, end });

function lanes(events: TimelineEvent[], minimum = 0) {
  return Object.fromEntries(
    layoutEvents(events, minimum).map((entry) => [
      entry.event.id,
      `${entry.column}/${entry.columns}`,
    ]),
  );
}

describe("layoutEvents", () => {
  test("events that do not overlap each take the full width", () => {
    expect(lanes([event("a", 480, 540), event("b", 540, 600)])).toEqual({ a: "0/1", b: "0/1" });
  });

  test("overlapping events share the width in lanes", () => {
    expect(lanes([event("a", 480, 600), event("b", 500, 560), event("c", 520, 580)])).toEqual({
      a: "0/3",
      b: "1/3",
      c: "2/3",
    });
  });

  test("a lane is reused once it frees up, and the whole chain shares the count", () => {
    expect(lanes([event("a", 480, 600), event("b", 490, 520), event("c", 530, 560)])).toEqual({
      a: "0/2",
      b: "1/2",
      c: "1/2",
    });
  });

  test("a later cluster starts over at one lane", () => {
    expect(lanes([event("a", 480, 540), event("b", 500, 520), event("c", 600, 660)])).toEqual({
      a: "0/2",
      b: "1/2",
      c: "0/1",
    });
  });

  test("the minimum length keeps a short event from sitting on the next one", () => {
    expect(lanes([event("a", 480, 485), event("b", 490, 520)])).toEqual({ a: "0/1", b: "0/1" });
    expect(lanes([event("a", 480, 485), event("b", 490, 520)], 30)).toEqual({
      a: "0/2",
      b: "1/2",
    });
  });

  test("the input order does not matter", () => {
    expect(lanes([event("c", 520, 580), event("a", 480, 600), event("b", 500, 560)])).toEqual({
      a: "0/3",
      b: "1/3",
      c: "2/3",
    });
  });
});

describe("clockMinutes", () => {
  test("reads HH:mm and rejects anything else", () => {
    expect(clockMinutes("08:30")).toBe(510);
    expect(clockMinutes("23:59")).toBe(1439);
    expect(clockMinutes("24:00")).toBeNull();
    expect(clockMinutes("8h30")).toBeNull();
  });
});

describe("M3DayTimeline", () => {
  function timeline(events: TimelineEvent[], current = false) {
    const selected: string[] = [];
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3DayTimeline, {
            events,
            startHour: 8,
            endHour: 18,
            hourHeight: 60,
            locale: "en",
            current,
            label: "Visits",
            eventLabel: (item: TimelineEvent) => `Visit ${item.id}`,
            onSelect: (item: TimelineEvent) => selected.push(item.id),
          }),
      }),
      { global: { plugins: [createM3e()] }, attachTo: document.body },
    );
    return { wrapper, selected };
  }

  test("places each event by its time and leaves out what falls outside the window", () => {
    const { wrapper } = timeline([
      event("a", 540, 600),
      event("b", 420, 450),
      event("c", 600, 615),
    ]);
    const slots = wrapper.findAll(".m3-day-timeline__slot");
    expect(slots).toHaveLength(2);
    expect(slots[0]!.attributes("style")).toContain("--m3-day-timeline-top: 60px");
    expect(slots[0]!.attributes("style")).toContain("--m3-day-timeline-height: 60px");
    expect(slots[1]!.attributes("style")).toContain("--m3-day-timeline-height: 28px");
    expect(wrapper.find(".m3-day-timeline__event--compact").exists()).toBe(true);
    wrapper.unmount();
  });

  test("an event is a labelled button that reports itself", async () => {
    const { wrapper, selected } = timeline([event("a", 540, 600)]);
    const button = wrapper.get("button.m3-day-timeline__event");
    expect(button.attributes("aria-label")).toBe("Visit a");
    await button.trigger("click");
    expect(selected).toEqual(["a"]);
    wrapper.unmount();
  });

  test("today draws the now line and moves it with the clock", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 4, 10, 15, 30));
    const { wrapper } = timeline([], true);
    const line = () => wrapper.get(".m3-day-timeline__now").attributes("style");
    expect(line()).toContain("--m3-day-timeline-top: 135px");
    vi.advanceTimersByTime(30_000);
    await nextTick();
    expect(line()).toContain("--m3-day-timeline-top: 136px");
    wrapper.unmount();
  });

  test("another day draws no now line", () => {
    const { wrapper } = timeline([], false);
    expect(wrapper.find(".m3-day-timeline__now").exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("M3Calendar marks", () => {
  test("marks days with something on them and reports the month it turns to", async () => {
    const months: string[] = [];
    const value = shallowRef("2026-10-04");
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3Calendar, {
            value: value.value,
            locale: "en",
            firstDay: 0,
            marks: { "2026-10-05": 4 },
            markLabel: (count: number) => `${count} visits`,
            onMonth: (month: { year: number; month: number }) =>
              months.push(`${month.year}-${month.month}`),
          }),
      }),
      { global: { plugins: [createM3e()] }, attachTo: document.body },
    );
    const marked = wrapper.get("[data-iso='2026-10-05']");
    expect(marked.find(".m3-calendar__mark").exists()).toBe(true);
    expect(marked.attributes("aria-label")).toContain("4 visits");
    expect(wrapper.get("[data-iso='2026-10-06']").find(".m3-calendar__mark").exists()).toBe(false);
    await wrapper.get("button[aria-label='Next month']").trigger("click");
    expect(months).toEqual(["2026-10"]);
    wrapper.unmount();
  });
});
