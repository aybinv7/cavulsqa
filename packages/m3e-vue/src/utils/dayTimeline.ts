/** How an event is tinted on the timeline: one of the container roles, or the neutral surface. */
export type TimelineTone = "primary" | "secondary" | "tertiary" | "surface";

/** Something on a day's timeline. `start` and `end` are minutes since midnight. */
export interface TimelineEvent {
  id: string;
  start: number;
  end: number;
  tone?: TimelineTone;
}

export interface PlacedEvent<T extends TimelineEvent> {
  event: T;
  /** The lane it sits in, from the start edge. */
  column: number;
  /** How many lanes its cluster of overlapping events shares. */
  columns: number;
}

/**
 * Lays overlapping events side by side, as Google Calendar does: events that overlap one another,
 * directly or through a chain, form a cluster; each takes the first lane free when it starts, and
 * every event in the cluster divides the width by the cluster's lane count. Events are measured at
 * least `minimum` minutes long, so a five-minute stop drawn at the minimum height does not sit on
 * top of the one after it.
 */
export function layoutEvents<T extends TimelineEvent>(
  events: readonly T[],
  minimum = 0,
): PlacedEvent<T>[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: PlacedEvent<T>[] = [];
  let cluster: PlacedEvent<T>[] = [];
  let lanes: number[] = [];
  let clusterEnd = -Infinity;

  const close = () => {
    for (const entry of cluster) entry.columns = lanes.length;
    cluster = [];
    lanes = [];
  };

  for (const event of sorted) {
    const end = Math.max(event.end, event.start + minimum);
    if (event.start >= clusterEnd) close();
    let column = lanes.findIndex((laneEnd) => laneEnd <= event.start);
    if (column === -1) column = lanes.push(end) - 1;
    else lanes[column] = end;
    const entry: PlacedEvent<T> = { event, column, columns: 1 };
    cluster.push(entry);
    placed.push(entry);
    clusterEnd = Math.max(clusterEnd, end);
  }
  close();
  return placed;
}

/** Minutes since midnight for `HH:mm`, or `null` when it is not one. */
export function clockMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Minutes since local midnight of `now`. */
export function minutesOfDay(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** A minute of the day in the locale's clock, `9:30 AM` or `09:30`. */
export function formatMinutes(minutes: number, locale: string, hour12?: boolean): string {
  const clamped = Math.min(24 * 60 - 1, Math.max(0, Math.round(minutes)));
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, Math.floor(clamped / 60), clamped % 60)));
}

/** An hour mark in the locale's clock, `9 AM` or `09`. */
export function formatHour(hour: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, hour % 24)),
  );
}
