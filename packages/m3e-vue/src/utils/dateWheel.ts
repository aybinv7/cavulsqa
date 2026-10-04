import type { WheelColumn, WheelOption } from "../components/picker/types.js";
import {
  clampIso,
  dateOrder,
  daysInMonth,
  parseIso,
  todayIso,
  toIso,
  type DatePart,
  type IsoDate,
} from "./calendar.js";

export interface DateWheelParts {
  year: number;
  /** 0-based. */
  month: number;
  day: number;
}

export interface DateWheelLabels {
  day: string;
  month: string;
  year: string;
}

const DEFAULT_SPAN = { before: 100, after: 50 };

/** The years a wheel offers: `min`..`max` when given, else a century back and fifty years on. */
export function wheelYears(min?: IsoDate, max?: IsoDate, today: IsoDate = todayIso()) {
  const current = parseIso(today)!.year;
  const first = parseIso(min)?.year ?? current - DEFAULT_SPAN.before;
  const last = parseIso(max)?.year ?? current + DEFAULT_SPAN.after;
  return { first, last: Math.max(first, last) };
}

/**
 * The date a wheel lands on: the day clamped to its month - 31 January spun to February is the
 * 28th or 29th, not 3 March - then the whole date clamped to `min`..`max`.
 */
export function composeWheelDate(parts: DateWheelParts, min?: IsoDate, max?: IsoDate): IsoDate {
  const day = Math.min(parts.day, daysInMonth(parts.year, parts.month));
  return clampIso(toIso(parts.year, parts.month, day), min, max);
}

interface Bounds {
  min?: IsoDate;
  max?: IsoDate;
}

const outside = ({ min, max }: Bounds, start: IsoDate, end: IsoDate) =>
  (min !== undefined && end < min) || (max !== undefined && start > max);

/** The days of one month, those outside the bounds disabled. */
export function wheelDayOptions(
  year: number,
  month: number,
  locale: string,
  bounds: Bounds = {},
): WheelOption<number>[] {
  const name = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  return Array.from({ length: daysInMonth(year, month) }, (_, index) => {
    const iso = toIso(year, month, index + 1);
    return { value: index + 1, label: name.format(index + 1), disabled: outside(bounds, iso, iso) };
  });
}

/** The twelve months by name, those wholly outside the bounds in `year` disabled. */
export function wheelMonthOptions(
  year: number,
  locale: string,
  bounds: Bounds = {},
): WheelOption<number>[] {
  const name = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, month) => ({
    value: month,
    label: name.format(new Date(Date.UTC(2000, month, 1))),
    disabled: outside(bounds, toIso(year, month, 1), toIso(year, month, daysInMonth(year, month))),
  }));
}

export function wheelYearOptions(locale: string, bounds: Bounds = {}): WheelOption<number>[] {
  const { first, last } = wheelYears(bounds.min, bounds.max);
  const name = new Intl.NumberFormat(locale, { useGrouping: false });
  return Array.from({ length: last - first + 1 }, (_, index) => ({
    value: first + index,
    label: name.format(first + index),
  }));
}

/** Day, month and year as wheel columns in the locale's order. */
export function orderDateColumns(
  locale: string,
  labels: DateWheelLabels,
  options: Record<DatePart, readonly WheelOption<number>[]>,
): WheelColumn<number>[] {
  const columns: Record<DatePart, WheelColumn<number>> = {
    day: { key: "day", label: labels.day, options: options.day, flex: 1, loop: true },
    month: { key: "month", label: labels.month, options: options.month, flex: 2.2, loop: true },
    year: { key: "year", label: labels.year, options: options.year, flex: 1.3 },
  };
  return dateOrder(locale).map((part) => columns[part]);
}

/** Day, month and year columns in the locale's order, with options outside `min`..`max` disabled. */
export function dateWheelColumns(
  parts: DateWheelParts,
  locale: string,
  labels: DateWheelLabels,
  min?: IsoDate,
  max?: IsoDate,
): WheelColumn<number>[] {
  const bounds = { min, max };
  return orderDateColumns(locale, labels, {
    day: wheelDayOptions(parts.year, parts.month, locale, bounds),
    month: wheelMonthOptions(parts.year, locale, bounds),
    year: wheelYearOptions(locale, bounds),
  });
}
