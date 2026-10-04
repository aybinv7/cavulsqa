/** A time of day as `HH:mm` on the 24-hour clock - a string, like `IsoDate`, so no zone touches it. */
export type IsoTime = string;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseIsoTime(
  value: string | null | undefined,
): { hour: number; minute: number } | null {
  const match = value ? TIME.exec(value) : null;
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

export function toIsoTime(hour: number, minute: number): IsoTime {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Whether the locale reads the clock in twelve-hour halves. */
export function uses12Hour(locale: string): boolean {
  const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h11" || cycle === "h12";
}

/** The locale's own AM and PM words. */
export function dayPeriodLabels(locale: string): [am: string, pm: string] {
  const format = (hour: number) =>
    new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true, timeZone: "UTC" })
      .formatToParts(new Date(Date.UTC(2000, 0, 1, hour)))
      .find((part) => part.type === "dayPeriod")?.value ?? (hour < 12 ? "AM" : "PM");
  return [format(9), format(21)];
}

/** `HH:mm` rounded down to the minute step, so a wheel never shows a value it does not offer. */
export function snapIsoTime(value: IsoTime, step: number): IsoTime {
  const parts = parseIsoTime(value);
  if (!parts) return value;
  return toIsoTime(parts.hour, parts.minute - (parts.minute % Math.max(1, step)));
}

export function formatIsoTime(value: IsoTime, locale: string, hour12?: boolean): string {
  const parts = parseIsoTime(value);
  if (!parts) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, parts.hour, parts.minute)));
}
