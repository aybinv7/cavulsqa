import { expect, test } from "vite-plus/test";
import {
  addDays,
  addMonths,
  clampIso,
  dateOrder,
  datePattern,
  daysInMonth,
  firstDayOfWeek,
  formatLocalDate,
  inRange,
  isIsoDate,
  monthGrid,
  parseIso,
  parseLocalDate,
  todayIso,
  weekdayLabels,
} from "../src/utils/calendar.js";

test("ISO dates are validated, including impossible days", () => {
  expect(isIsoDate("2026-02-28")).toBe(true);
  expect(isIsoDate("2026-02-29")).toBe(false);
  expect(isIsoDate("2028-02-29")).toBe(true);
  expect(isIsoDate("2026-13-01")).toBe(false);
  expect(parseIso("not a date")).toBeNull();
});

test("days and months roll over without a Date at local midnight", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  expect(addMonths({ year: 2026, month: 11 }, 14)).toEqual({ year: 2028, month: 1 });
  expect(daysInMonth(2024, 1)).toBe(29);
});

test("a month grid is whole weeks starting on the locale's first day", () => {
  const monday = monthGrid({ year: 2026, month: 9 }, 1);
  expect(monday.every((week) => week.length === 7)).toBe(true);
  expect(monday[0]![0]!.iso).toBe("2026-09-28");
  expect(monday[0]![3]!).toEqual({ iso: "2026-10-01", day: 1, inMonth: true });
  const sunday = monthGrid({ year: 2026, month: 9 }, 0);
  expect(sunday[0]![0]!.iso).toBe("2026-09-27");
  const inMonth = monday.flat().filter((cell) => cell.inMonth);
  expect(inMonth).toHaveLength(31);
});

test("a filled grid is always six weeks, ending in the next month", () => {
  const filled = monthGrid({ year: 2026, month: 9 }, 0, true);
  expect(filled).toHaveLength(6);
  expect(filled.at(-1)!.at(-1)!).toEqual({ iso: "2026-11-07", day: 7, inMonth: false });
  expect(monthGrid({ year: 2026, month: 9 }, 0)).toHaveLength(5);
});

test("weekday labels follow the first day", () => {
  expect(weekdayLabels("en", 1, "short")[0]).toBe("Mon");
  expect(weekdayLabels("en", 0, "short")[0]).toBe("Sun");
  expect([0, 1, 6]).toContain(firstDayOfWeek("en-US"));
});

test("ranges and clamping compare as strings", () => {
  expect(inRange("2026-05-10", "2026-05-01", "2026-05-20")).toBe(true);
  expect(inRange("2026-05-01", "2026-05-01", "2026-05-20")).toBe(false);
  expect(clampIso("2026-01-01", "2026-02-01")).toBe("2026-02-01");
  expect(todayIso(new Date(2026, 9, 3, 23, 59))).toBe("2026-10-03");
});

test("typed dates follow the locale's order", () => {
  expect(dateOrder("fr")).toEqual(["day", "month", "year"]);
  expect(dateOrder("en-US")).toEqual(["month", "day", "year"]);
  expect(parseLocalDate("22/11/2006", "fr")).toBe("2006-11-22");
  expect(parseLocalDate("11.22.2006", "en-US")).toBe("2006-11-22");
  expect(parseLocalDate("31/02/2026", "fr")).toBeNull();
  expect(parseLocalDate("22/11/06", "fr")).toBeNull();
  expect(datePattern("fr")).toBe("dd/mm/yyyy");
  expect(formatLocalDate("2006-11-22", "fr")).toBe("22/11/2006");
});
