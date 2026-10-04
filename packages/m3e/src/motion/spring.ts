export interface SpringSpec {
  /** ζ: below 1 overshoots, 1 is critically damped. */
  dampingRatio: number;
  /** k, with mass 1: ω₀ = √k. */
  stiffness: number;
}

export interface SpringState {
  /** 0 at the start, 1 at rest; overshoots past 1 when underdamped. */
  value: number;
  /** In units of the whole travel per second. */
  velocity: number;
}

/**
 * Compose's `spring(dampingRatio, stiffness)` from 0 to 1 as a closed form, so a frame asks where
 * the spring is instead of integrating. `initialVelocity` (travel per second) is what a gesture
 * hands over on release, and what an interrupted animation carries into its new target.
 */
export function springState(seconds: number, spec: SpringSpec, initialVelocity = 0): SpringState {
  if (seconds <= 0) return { value: 0, velocity: initialVelocity };
  const omega = Math.sqrt(spec.stiffness);
  const zeta = spec.dampingRatio;
  const t = seconds;

  if (zeta < 1) {
    const decay = zeta * omega;
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    const a = -1;
    const b = (initialVelocity + decay * a) / damped;
    const envelope = Math.exp(-decay * t);
    const cos = Math.cos(damped * t);
    const sin = Math.sin(damped * t);
    const displacement = envelope * (a * cos + b * sin);
    const velocity = envelope * ((b * damped - decay * a) * cos - (a * damped + decay * b) * sin);
    return { value: 1 + displacement, velocity };
  }

  if (zeta === 1) {
    const a = -1;
    const b = initialVelocity + omega * a;
    const envelope = Math.exp(-omega * t);
    return { value: 1 + envelope * (a + b * t), velocity: envelope * (b - omega * (a + b * t)) };
  }

  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega * (zeta - root);
  const r2 = -omega * (zeta + root);
  const c2 = (initialVelocity + r1) / (r2 - r1);
  const c1 = -1 - c2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return { value: 1 + c1 * e1 + c2 * e2, velocity: c1 * r1 * e1 + c2 * r2 * e2 };
}

/** The position alone, for a frame that does not need the velocity. */
export function springAt(seconds: number, spec: SpringSpec, initialVelocity = 0): number {
  return springState(seconds, spec, initialVelocity).value;
}

/**
 * How long until the spring stays within `threshold` of rest with negligible speed, in seconds.
 * Found by stepping, since an underdamped spring passes the threshold several times.
 */
export function springSettleTime(spec: SpringSpec, threshold = 0.001, initialVelocity = 0): number {
  const step = 1 / 600;
  let lastOutside = 0;
  for (let t = 0; t < 10; t += step) {
    const { value, velocity } = springState(t, spec, initialVelocity);
    if (Math.abs(1 - value) > threshold || Math.abs(velocity) > threshold * 10) lastOutside = t;
    else if (t - lastOutside > 0.1) break;
  }
  return lastOutside + step;
}

/**
 * The spring as a CSS `linear()` easing over `durationMs`, so a non-interruptible CSS transition
 * keeps the overshoot a cubic-bezier cannot draw. The last stop is pinned to 1, which a spring
 * reaches only asymptotically.
 */
export function springEasing(spec: SpringSpec, durationMs: number, stops = 32): string {
  const values: string[] = [];
  for (let i = 0; i < stops; i++) {
    const value = springAt(((durationMs / 1000) * i) / (stops - 1), spec);
    values.push(i === stops - 1 ? "1" : String(Number(value.toFixed(4))));
  }
  return `linear(${values.join(", ")})`;
}
