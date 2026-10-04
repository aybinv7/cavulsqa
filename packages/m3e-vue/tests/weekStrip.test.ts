import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3WeekStrip, createM3e } from "../src/index.js";
import { startOfWeek, weekDays } from "../src/utils/calendar.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("week helpers", () => {
  test("a week starts on the locale's first day", () => {
    expect(startOfWeek("2026-10-08", 0)).toBe("2026-10-04");
    expect(startOfWeek("2026-10-08", 1)).toBe("2026-10-05");
    expect(startOfWeek("2026-10-04", 6)).toBe("2026-10-03");
    expect(weekDays("2026-12-28")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });
});

describe("M3WeekStrip", () => {
  function strip(start = "2026-10-08") {
    const day = shallowRef(start);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3WeekStrip, {
            label: "Route days",
            locale: "en",
            firstDay: 1,
            marks: { "2026-10-07": 3 },
            modelValue: day.value,
            "onUpdate:modelValue": (value: string) => (day.value = value),
          }),
      }),
      { attachTo: document.body, global: { plugins: [createM3e({ reducedMotion: true })] } },
    );
    return { wrapper, day };
  }

  test("shows three weeks with only the middle one live, the chosen day pressed and marks counted", () => {
    const { wrapper } = strip();
    const weeks = wrapper.findAll(".m3-week-strip__week");
    expect(weeks).toHaveLength(3);
    expect(weeks.map((week) => week.attributes("inert") !== undefined)).toEqual([
      true,
      false,
      true,
    ]);
    const live = weeks[1]!.findAll("button");
    expect(live.map((button) => button.attributes("data-day"))).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(live[3]!.attributes("aria-pressed")).toBe("true");
    expect(live[2]!.attributes("aria-label")).toBe("Wednesday, October 7, 3 items");
    expect(live[2]!.find(".m3-week-strip__mark--on").exists()).toBe(true);
  });

  test("a tap chooses a day; the arrow keys cross into the next week", async () => {
    const { wrapper, day } = strip();
    await wrapper.find('[data-day="2026-10-06"]').trigger("click");
    expect(day.value).toBe("2026-10-06");
    await wrapper.get(".m3-week-strip").trigger("keydown", { key: "End" });
    expect(day.value).toBe("2026-10-11");
    await wrapper.get(".m3-week-strip").trigger("keydown", { key: "ArrowRight" });
    expect(day.value).toBe("2026-10-12");
    await nextTick();
    await nextTick();
    const live = wrapper.findAll(".m3-week-strip__week")[1]!;
    expect(live.find("button").attributes("data-day")).toBe("2026-10-12");
  });

  test("settling on the next week moves the chosen day a week on and recentres", async () => {
    const { wrapper, day } = strip();
    const track = wrapper.get(".m3-week-strip").element as HTMLElement;
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(360);
    track.scrollLeft = 720;
    track.dispatchEvent(new Event("scrollend"));
    await nextTick();
    await nextTick();
    expect(day.value).toBe("2026-10-15");
    expect(wrapper.findAll(".m3-week-strip__week")[1]!.find("button").attributes("data-day")).toBe(
      "2026-10-12",
    );
    expect(track.scrollLeft).toBe(360);
  });
});
