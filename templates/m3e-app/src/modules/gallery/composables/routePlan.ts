import { WILAYAS } from "@/modules/gallery/composables/wilayas";

export type VisitState = "done" | "next" | "planned";

export interface Visit {
  id: string;
  time: string;
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
 * database. Friday and Saturday are the weekend. Past days are done; today's first visits are done
 * and the next one is marked.
 */
export function visitsFor(day: string, today: string): Visit[] {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (WEEKEND.has(weekday)) return [];
  const base = seed(day);
  const count = 3 + (base % 4);
  return Array.from({ length: count }, (_, index) => {
    const minutes = 8 * 60 + index * 75 + ((base >> index) % 3) * 10;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const state: VisitState =
      day < today
        ? "done"
        : day > today
          ? "planned"
          : index < 2
            ? "done"
            : index === 2
              ? "next"
              : "planned";
    return {
      id: `${day}-${index}`,
      time,
      customer: SHOPS[(base + index * 3) % SHOPS.length]!,
      city: WILAYAS[(base + index * 7) % WILAYAS.length]!,
      state,
    };
  });
}

/** How many visits each day of the weeks around `day` holds, for the week strip's dots. */
export function marksAround(day: string, today: string): Record<string, number> {
  const marks: Record<string, number> = {};
  const centre = Date.parse(`${day}T00:00:00Z`);
  for (let offset = -21; offset <= 21; offset += 1) {
    const date = new Date(centre + offset * 86_400_000).toISOString().slice(0, 10);
    const count = visitsFor(date, today).length;
    if (count > 0) marks[date] = count;
  }
  return marks;
}
