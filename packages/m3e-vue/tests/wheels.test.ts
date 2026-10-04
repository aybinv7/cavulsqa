import { describe, expect, it } from "vite-plus/test";
import { composeWheelDate, dateWheelColumns, wheelYears } from "../src/utils/dateWheel.js";
import {
  dayPeriodLabels,
  formatIsoTime,
  parseIsoTime,
  snapIsoTime,
  toIsoTime,
  uses12Hour,
} from "../src/utils/time.js";

const LABELS = { day: "Day", month: "Month", year: "Year" };

describe("composeWheelDate", () => {
  it("pulls the day back into a shorter month", () => {
    expect(composeWheelDate({ year: 2025, month: 1, day: 31 })).toBe("2025-02-28");
    expect(composeWheelDate({ year: 2024, month: 1, day: 31 })).toBe("2024-02-29");
  });

  it("clamps to the bounds", () => {
    expect(composeWheelDate({ year: 2020, month: 0, day: 1 }, "2024-06-15")).toBe("2024-06-15");
    expect(composeWheelDate({ year: 2030, month: 0, day: 1 }, undefined, "2026-01-01")).toBe(
      "2026-01-01",
    );
  });
});

describe("dateWheelColumns", () => {
  it("follows the locale's order", () => {
    const parts = { year: 2025, month: 10, day: 22 };
    expect(dateWheelColumns(parts, "fr", LABELS).map((c) => c.key)).toEqual([
      "day",
      "month",
      "year",
    ]);
    expect(dateWheelColumns(parts, "en-US", LABELS).map((c) => c.key)).toEqual([
      "month",
      "day",
      "year",
    ]);
  });

  it("offers the month's own days and disables those outside the bounds", () => {
    const columns = dateWheelColumns(
      { year: 2025, month: 1, day: 10 },
      "fr",
      LABELS,
      "2025-02-05",
      "2025-03-31",
    );
    const days = columns.find((c) => c.key === "day")!.options;
    const months = columns.find((c) => c.key === "month")!.options;
    const years = columns.find((c) => c.key === "year")!.options;
    expect(days).toHaveLength(28);
    expect(days.filter((d) => d.disabled).map((d) => d.value)).toEqual([1, 2, 3, 4]);
    expect(months.filter((m) => !m.disabled).map((m) => m.value)).toEqual([1, 2]);
    expect(years.map((y) => y.value)).toEqual([2025]);
  });

  it("spans a century back and fifty years on without bounds", () => {
    expect(wheelYears(undefined, undefined, "2026-10-03")).toEqual({ first: 1926, last: 2076 });
  });
});

describe("time", () => {
  it("parses and writes HH:mm", () => {
    expect(parseIsoTime("07:05")).toEqual({ hour: 7, minute: 5 });
    expect(parseIsoTime("24:00")).toBeNull();
    expect(toIsoTime(7, 5)).toBe("07:05");
  });

  it("snaps down to the minute step", () => {
    expect(snapIsoTime("10:59", 15)).toBe("10:45");
    expect(snapIsoTime("10:59", 1)).toBe("10:59");
  });

  it("knows which locales read a twelve-hour clock", () => {
    expect(uses12Hour("en-US")).toBe(true);
    expect(uses12Hour("fr")).toBe(false);
    const [am, pm] = dayPeriodLabels("en-US");
    expect(am).toMatch(/AM/i);
    expect(pm).toMatch(/PM/i);
  });

  it("formats in the locale", () => {
    expect(formatIsoTime("15:05", "fr")).toBe("15:05");
    expect(formatIsoTime("15:05", "en-US")).toMatch(/3:05\sPM/);
  });
});
