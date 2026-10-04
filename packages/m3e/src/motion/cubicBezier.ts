export type CubicBezier = readonly [x1: number, y1: number, x2: number, y2: number];

export type Easing = (t: number) => number;

const sample = (a: number, b: number, t: number) =>
  ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
const slope = (a: number, b: number, t: number) =>
  3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;

/** A CSS `cubic-bezier()` as a function, for frames driven from JavaScript. */
export function cubicBezier([x1, y1, x2, y2]: CubicBezier): Easing {
  if (x1 === y1 && x2 === y2) return (t) => t;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sample(x1, x2, t) - x;
      if (Math.abs(error) < 1e-6) return t;
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= error / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sample(x1, x2, t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sample(y1, y2, solve(t)));
}

export function cssCubicBezier([x1, y1, x2, y2]: CubicBezier): string {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}
