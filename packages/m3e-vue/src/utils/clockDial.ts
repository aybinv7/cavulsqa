/**
 * Geometry of the time picker's clock dial, on a dial of any size. Angles are degrees clockwise
 * from twelve o'clock. Ring radii are Compose's `ClockDialOuterRadius` (101dp) and inner (69dp)
 * scaled from its 256dp dial.
 */
export type DialMode = "hour" | "minute";

export const DIAL_SIZE = 256;
const OUTER = 101 / DIAL_SIZE;
const INNER = 69 / DIAL_SIZE;

export interface DialLabel {
  value: number;
  text: string;
  x: number;
  y: number;
  inner: boolean;
}

/** The point at `angle` and `radius` from the dial's centre. */
export function polarPoint(angle: number, radius: number, size: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: size / 2 + radius * Math.sin(radians), y: size / 2 - radius * Math.cos(radians) };
}

export function ringRadius(inner: boolean, size: number): number {
  return (inner ? INNER : OUTER) * size;
}

/** Where `value` sits: its angle, and whether a 24-hour dial puts it on the inner ring. */
export function dialAngle(value: number, mode: DialMode, hour24: boolean) {
  if (mode === "minute") return { angle: (value % 60) * 6, inner: false };
  return { angle: (value % 12) * 30, inner: hour24 && (value === 0 || value > 12) };
}

/**
 * The labels around the dial: minutes in fives; twelve hours, with a 24-hour dial adding 13-23
 * and 00 on the inner ring, as Compose lays them out.
 */
export function dialLabels(
  mode: DialMode,
  hour24: boolean,
  size: number,
  format: (value: number) => string,
): DialLabel[] {
  const make = (value: number, text: string) => {
    const { angle, inner } = dialAngle(value, mode, hour24);
    return { value, text, inner, ...polarPoint(angle, ringRadius(inner, size), size) };
  };
  if (mode === "minute")
    return Array.from({ length: 12 }, (_, index) => make(index * 5, format(index * 5)));
  const outer = Array.from({ length: 12 }, (_, index) => {
    const hour = index === 0 ? 12 : index;
    return make(hour, String(hour));
  });
  if (!hour24) return outer;
  const inner = Array.from({ length: 12 }, (_, index) => {
    const hour = index === 0 ? 0 : index + 12;
    return make(hour, format(hour));
  });
  return [...outer, ...inner];
}

/** Where the handle rests for `value`: its angle and its distance from the centre. */
export function dialHandle(value: number, mode: DialMode, hour24: boolean, size: number) {
  const { angle, inner } = dialAngle(value, mode, hour24);
  return { angle, radius: ringRadius(inner, size) };
}

/**
 * The value under a touch at (`x`, `y`) on the dial: hours snap to the hour, minutes to the minute
 * while dragging or to the nearest five on a tap (`snapFive`). On a 24-hour dial the ring nearer
 * the touch decides between, say, 1 and 13. `pm` keeps a 12-hour dial in the afternoon.
 */
export function dialValueAt(
  x: number,
  y: number,
  size: number,
  mode: DialMode,
  hour24: boolean,
  options: { snapFive?: boolean; pm?: boolean } = {},
): number {
  const dx = x - size / 2;
  const dy = y - size / 2;
  const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  if (mode === "minute") {
    const step = options.snapFive ? 5 : 1;
    return (Math.round(angle / (6 * step)) * step) % 60;
  }
  const position = Math.round(angle / 30) % 12;
  if (hour24) {
    const inner = Math.hypot(dx, dy) < ((OUTER + INNER) / 2) * size;
    if (inner) return position === 0 ? 0 : position + 12;
    return position === 0 ? 12 : position;
  }
  return position + (options.pm ? 12 : 0);
}
