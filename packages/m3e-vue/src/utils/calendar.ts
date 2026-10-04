/**
 * Calendar arithmetic on ISO dates (`YYYY-MM-DD`). Dates stay strings end to end: a `Date` at local
 * midnight shifts a day when the timezone or DST moves under it, which is how a picked birthday
 * comes back as the day before. Strings compare in order, so ranges need no `Date` either.
 */
export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface YearMonth {
  year: number;
  /** 0-based, as `Date` counts. */
  month: number;
}

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

export function toIso(year: number, month: number, day: number): IsoDate {
  return `${pad(year, 4)}-${pad(month + 1)}-${pad(day)}`;
}

export function parseIso(
  value: string | null | undefined,
): { year: number; month: number; day: number } | null {
  const match = value ? ISO.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === "string" && parseIso(value) !== null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function addDays(value: IsoDate, delta: number): IsoDate {
  const parts = parseIso(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day + delta));
  return toIso(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** 0 = Sunday … 6 = Saturday, as `Date.getDay`. */
export function weekday(value: IsoDate): number {
  const parts = parseIso(value)!;
  return new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
}

export interface DayCell {
  iso: IsoDate;
  day: number;
  inMonth: boolean;
}

/**
 * The month as weeks of seven, starting on `firstDay` (0 = Sunday). Cells outside the month are
 * included so every row is full; a picker shows them blank.
 */
export function monthGrid({ year, month }: YearMonth, firstDay: number, fill = false): DayCell[][] {
  const first = toIso(year, month, 1);
  const lead = (weekday(first) - firstDay + 7) % 7;
  const total = fill ? 42 : Math.ceil((lead + daysInMonth(year, month)) / 7) * 7;
  const weeks: DayCell[][] = [];
  for (let index = 0; index < total; index++) {
    const iso = addDays(first, index - lead);
    const parts = parseIso(iso)!;
    if (index % 7 === 0) weeks.push([]);
    weeks
      .at(-1)!
      .push({ iso, day: parts.day, inMonth: parts.month === month && parts.year === year });
  }
  return weeks;
}

/** The locale's first day of the week, from `Intl.Locale` week info where the engine has it. */
export function firstDayOfWeek(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (firstDay !== undefined) return firstDay % 7;
  } catch {
    return 1;
  }
  return 1;
}

/** Narrow weekday labels in the grid's order. */
export function weekdayLabels(
  locale: string,
  firstDay: number,
  style: "narrow" | "short" = "narrow",
): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(2023, 0, 1 + ((firstDay + index) % 7)))),
  );
}

export function formatIso(
  value: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const parts = parseIso(value);
  if (!parts) return "";
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(parts.year, parts.month, parts.day)),
  );
}

export function formatMonth({ year, month }: YearMonth, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function clampIso(value: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

export function inRange(value: IsoDate, start: IsoDate | null, end: IsoDate | null): boolean {
  return start !== null && end !== null && value > start && value < end;
}

export type DatePart = "day" | "month" | "year";

/** The order a locale writes a numeric date in, e.g. `["day","month","year"]` for `fr`. */
export function dateOrder(locale: string): DatePart[] {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
    .formatToParts(new Date(Date.UTC(2006, 10, 22)))
    .map((part) => part.type)
    .filter((type): type is DatePart => type === "day" || type === "month" || type === "year");
  return parts.length === 3 ? parts : ["month", "day", "year"];
}

/** A typed date in the locale's order with any separators - `22/11/2006`, `22.11.2006` - as ISO. */
export function parseLocalDate(text: string, locale: string): IsoDate | null {
  const numbers = text.match(/\d+/g);
  if (!numbers || numbers.length !== 3) return null;
  const order = dateOrder(locale);
  const value: Record<DatePart, number> = { day: 0, month: 0, year: 0 };
  order.forEach((part, index) => (value[part] = Number(numbers[index])));
  if (String(numbers[order.indexOf("year")]).length !== 4) return null;
  const iso = toIso(value.year, value.month - 1, value.day);
  return parseIso(iso) ? iso : null;
}

/** The placeholder for typed input in the locale's order, e.g. `dd/mm/yyyy`. */
export function datePattern(
  locale: string,
  labels: Record<DatePart, string> = { day: "dd", month: "mm", year: "yyyy" },
): string {
  const separator =
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    })
      .formatToParts(new Date(Date.UTC(2006, 10, 22)))
      .find((part) => part.type === "literal")?.value ?? "/";
  return dateOrder(locale)
    .map((part) => labels[part])
    .join(separator);
}

export function formatLocalDate(value: IsoDate, locale: string): string {
  return formatIso(value, locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
