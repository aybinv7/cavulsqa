/** The geometry behind the charts, pure so every axis and path is testable. */
export interface Point {
  x: number;
  y: number;
}

export interface Scale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/**
 * A y axis with round steps - 1, 2, 2.5 or 5 times a power of ten - that covers the data and
 * includes zero, so bars and areas always grow from a real baseline.
 */
export function niceScale(values: readonly number[], count = 5): Scale {
  const finite = values.filter((value) => Number.isFinite(value));
  let low = Math.min(0, ...finite);
  let high = Math.max(0, ...finite);
  if (low === high) high = low + 1;
  const raw = (high - low) / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  low = Math.floor(low / step) * step;
  high = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let tick = low; tick <= high + step / 2; tick += step) ticks.push(Number(tick.toFixed(10)));
  return { min: low, max: high, step, ticks };
}

/** Which of `count` labels fit across `width` with `spacing` px each, evenly thinned. */
export function visibleLabels(count: number, width: number, spacing: number): number[] {
  if (count <= 0) return [];
  const fit = Math.max(1, Math.floor(width / spacing));
  const every = Math.max(1, Math.ceil(count / fit));
  const indexes: number[] = [];
  for (let index = 0; index < count; index += every) indexes.push(index);
  return indexes;
}

/**
 * A path through the points: straight segments, or a monotone cubic that bends smoothly but never
 * swings above or below the data between two points - a chart must not invent a peak.
 */
export function linePath(points: readonly Point[], smooth: boolean): string {
  if (points.length === 0) return "";
  const head = `M${points[0]!.x},${points[0]!.y}`;
  if (!smooth || points.length < 3) {
    return (
      head +
      points
        .slice(1)
        .map((p) => `L${p.x},${p.y}`)
        .join("")
    );
  }
  const slopes = points.slice(0, -1).map((p, i) => {
    const next = points[i + 1]!;
    return (next.y - p.y) / (next.x - p.x || 1);
  });
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0]!;
    if (i === points.length - 1) return slopes.at(-1)!;
    const before = slopes[i - 1]!;
    const after = slopes[i]!;
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  let d = head;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    const third = (q.x - p.x) / 3;
    d += `C${p.x + third},${p.y + tangents[i]! * third} ${q.x - third},${q.y - tangents[i + 1]! * third} ${q.x},${q.y}`;
  }
  return d;
}

/** The line closed down to the baseline, for an area. */
export function areaPath(points: readonly Point[], smooth: boolean, baseline: number): string {
  if (points.length === 0) return "";
  return `${linePath(points, smooth)}L${points.at(-1)!.x},${baseline}L${points[0]!.x},${baseline}Z`;
}

/**
 * One donut segment from `start` to `end` (fractions of the turn, clockwise from 12 o'clock),
 * between two radii, with square ends. A full turn becomes two halves, which an SVG arc can draw.
 */
export function donutSegment(
  center: Point,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const turn = Math.max(0, end - start);
  if (turn >= 0.9999) {
    return (
      donutSegment(center, outer, inner, start, start + 0.5) +
      donutSegment(center, outer, inner, start + 0.5, start + 0.9999)
    );
  }
  const at = (fraction: number, radius: number): Point => {
    const angle = fraction * Math.PI * 2 - Math.PI / 2;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  };
  const large = turn > 0.5 ? 1 : 0;
  const a = at(start, outer);
  const b = at(end, outer);
  const c = at(end, inner);
  const d = at(start, inner);
  const f = (n: number) => Number(n.toFixed(3));
  return (
    `M${f(a.x)},${f(a.y)}A${outer},${outer} 0 ${large} 1 ${f(b.x)},${f(b.y)}` +
    `L${f(c.x)},${f(c.y)}A${inner},${inner} 0 ${large} 0 ${f(d.x)},${f(d.y)}Z`
  );
}

/** Each value's share of the total and its span of the turn, leaving `gap` turns between segments. */
export function donutSpans(
  values: readonly number[],
  gap: number,
): Array<{ start: number; end: number; share: number }> {
  const positive = values.map((value) => Math.max(0, value));
  const total = positive.reduce((sum, value) => sum + value, 0);
  const shown = positive.filter((value) => value > 0).length;
  const usable = 1 - (shown > 1 ? gap * shown : 0);
  let cursor = 0;
  return positive.map((value) => {
    const share = total > 0 ? value / total : 0;
    const span = share * usable;
    const start = cursor;
    cursor += span + (value > 0 && shown > 1 ? gap : 0);
    return { start, end: start + span, share };
  });
}
