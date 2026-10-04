import { WILAYAS } from "@/modules/gallery/composables/wilayas";

export type VisitState = "done" | "next" | "planned";

export interface Visit {
  id: string;
  time: string;
  /** Minutes since midnight. */
  start: number;
  end: number;
  customer: string;
  city: string;
  state: VisitState;
}

const SHOPS = [
  "Supérette El Feth",
  "Alimentation Bachir",
  "Market Ennour",
  "Supérette Djamel",
  "Épicerie Yacine",
  "Mini-market Salam",
  "Alimentation Rachid",
  "Supérette El Baraka",
];

const WEEKEND = new Set([5, 6]);

function seed(day: string): number {
  let hash = 0;
  for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

/**
 * A rep's visits for a day, the same every time for the same date, so the agenda demo needs no
 * database. Friday and Saturday are the weekend. Past days are done; today, what ended before `now`
 * (minutes since midnight) is done and the first one still running or ahead is next.
 */
export function visitsFor(day: string, today: string, now = 0): Visit[] {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (WEEKEND.has(weekday)) return [];
  const base = seed(day);
  const count = 3 + (base % 4);
  const visits = Array.from({ length: count }, (_, index) => {
    const minutes = 8 * 60 + index * 75 + ((base >> index) % 3) * 10;
    const duration = 30 + ((base >> (index + 2)) % 4) * 15;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return {
      id: `${day}-${index}`,
      time,
      start: minutes,
      end: minutes + duration,
      customer: SHOPS[(base + index * 3) % SHOPS.length]!,
      city: WILAYAS[(base + index * 7) % WILAYAS.length]!,
      state: "planned" as VisitState,
    };
  });
  const next = day === today ? visits.findIndex((visit) => visit.end > now) : -1;
  for (const [index, visit] of visits.entries()) {
    if (day < today || (day === today && (next === -1 || index < next))) visit.state = "done";
    else if (index === next) visit.state = "next";
  }
  return visits;
}

/** How many visits each day from `from` to `to`, both included, holds - the dots on a calendar. */
export function marksBetween(from: string, to: string, today: string): Record<string, number> {
  const marks: Record<string, number> = {};
  const last = Date.parse(`${to}T00:00:00Z`);
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= last; time += 86_400_000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const count = visitsFor(date, today).length;
    if (count > 0) marks[date] = count;
  }
  return marks;
}

/** The visits on the weeks around `day`, for the week strip's dots. */
export function marksAround(day: string, today: string): Record<string, number> {
  const centre = Date.parse(`${day}T00:00:00Z`);
  const at = (offset: number) => new Date(centre + offset * 86_400_000).toISOString().slice(0, 10);
  return marksBetween(at(-21), at(21), today);
}

/** The visits on every day a month grid shows, its outside days included. */
export function marksForMonth(year: number, month: number, today: string): Record<string, number> {
  const at = (day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  return marksBetween(at(-6), at(38), today);
}
