/** A point of a stroke, in fractions of the pad's width and height, with its time and pressure. */
export interface SignaturePoint {
  x: number;
  y: number;
  t: number;
  pressure: number;
}

export type SignatureStroke = SignaturePoint[];

export interface StrokeWidth {
  min: number;
  max: number;
}

/**
 * The pen width at a point: pressure when the pen reports it, otherwise speed - a slow line is
 * heavy, a quick flick thin, as ink behaves. `previous` is the width at the last point, so the
 * line thickens and thins gradually instead of stepping.
 */
export function strokeWidth(
  from: SignaturePoint,
  to: SignaturePoint,
  size: { width: number; height: number },
  width: StrokeWidth,
  previous?: number,
): number {
  let target: number;
  if (to.pressure > 0 && to.pressure !== 0.5) {
    target = width.min + (width.max - width.min) * Math.min(1, to.pressure);
  } else {
    const distance = Math.hypot((to.x - from.x) * size.width, (to.y - from.y) * size.height);
    const speed = distance / Math.max(1, to.t - from.t);
    target = Math.max(width.min, width.max - speed * (width.max - width.min) * 0.6);
  }
  return previous === undefined ? target : previous * 0.6 + target * 0.4;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * The strokes as SVG: each one a smoothed path through the midpoints of its segments, at the
 * pad's size, in `color`. A single tap becomes a dot. The SVG carries only paths, so it can be
 * stored and shown again anywhere.
 */
export function strokesToSvg(
  strokes: readonly SignatureStroke[],
  size: { width: number; height: number },
  options: { color: string; width: number },
): string {
  const paths = strokes
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => {
      const points = stroke.map((point) => ({ x: point.x * size.width, y: point.y * size.height }));
      const first = points[0]!;
      if (points.length === 1) {
        return `<circle cx="${round(first.x)}" cy="${round(first.y)}" r="${round(options.width / 2)}" fill="${options.color}"/>`;
      }
      let d = `M${round(first.x)} ${round(first.y)}`;
      for (let index = 1; index < points.length - 1; index += 1) {
        const point = points[index]!;
        const next = points[index + 1]!;
        d += ` Q${round(point.x)} ${round(point.y)} ${round((point.x + next.x) / 2)} ${round((point.y + next.y) / 2)}`;
      }
      const last = points.at(-1)!;
      d += ` L${round(last.x)} ${round(last.y)}`;
      return `<path d="${d}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size.width)}" height="${Math.round(size.height)}" viewBox="0 0 ${Math.round(size.width)} ${Math.round(size.height)}"><g fill="none" stroke="${options.color}" stroke-width="${options.width}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
