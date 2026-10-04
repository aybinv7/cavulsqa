/**
 * Material 3 Expressive's progress indicators as SVG geometry, with `WavyProgressIndicator`'s
 * defaults: the active part may be a wave, the track is always flat, a gap separates them, and the
 * wave shows only between 10% and 95% - flat at the ends, where a wave reads as noise. Pure
 * functions: a frame asks for paths, nothing here touches the DOM.
 *
 * @see https://m3.material.io/components/progress-indicators/specs
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WavyProgressIndicator.kt
 */
export interface WaveShape {
  thickness: number;
  amplitude: number;
  wavelength: number;
  gap: number;
}

export const CIRCULAR_WAVE: Readonly<WaveShape> = {
  thickness: 4,
  amplitude: 1.6,
  wavelength: 15,
  gap: 4,
};
export const LINEAR_WAVE: Readonly<WaveShape> = {
  thickness: 4,
  amplitude: 3,
  wavelength: 40,
  gap: 4,
};
export const LINEAR_INDETERMINATE_WAVELENGTH = 20;
export const LINEAR_STOP_SIZE = 4;
export const CIRCULAR_WAVY_SIZE = 48;
export const CIRCULAR_FLAT_SIZE = 40;
/** A wave travels one wavelength per second, Compose's default `waveSpeed`. */
export const WAVE_PERIOD_MS = 1000;
/** Progress moves to a new value linearly over this long. */
export const PROGRESS_GLIDE_MS = 500;
/** Amplitude fades in on `standard` and out on `emphasizedAccelerate`, over this long. */
export const AMPLITUDE_FADE_MS = 500;

/** `WavyProgressIndicatorDefaults.indicatorAmplitude`: no wave near empty or full. */
export function waveAmplitudeFor(progress: number): number {
  return progress <= 0.1 || progress >= 0.95 ? 0 : 1;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const fmt = (value: number) => value.toFixed(2);

/**
 * Where a circular indicator runs: `span` radians of arc from `start`, clockwise. The full ring
 * starts at 12 o'clock; the gauge is the upper half, from 9 o'clock over the top to 3.
 */
export interface ArcShape {
  start: number;
  span: number;
}

export const FULL_RING: Readonly<ArcShape> = { start: -Math.PI / 2, span: Math.PI * 2 };
export const HALF_GAUGE: Readonly<ArcShape> = { start: Math.PI, span: Math.PI };

export interface CircularPaths {
  active: string;
  track: string;
}

const polar = (center: number, radius: number, angle: number) =>
  `${fmt(center + radius * Math.cos(angle))} ${fmt(center + radius * Math.sin(angle))}`;

/**
 * A ring, or an arc of one, in a `size` box, its active part running from `from` to `to` (fractions
 * of the arc; an indeterminate indicator moves both). The wavelength is nudged so a whole number of
 * waves fits the arc, which keeps a travelling wave seamless.
 */
export function circularPaths(
  size: number,
  from: number,
  to: number,
  shape: WaveShape,
  amplitudeScale: number,
  phase: number,
  arc: ArcShape = FULL_RING,
): CircularPaths {
  const start = clamp01(Math.min(from, to));
  const end = clamp01(Math.max(from, to));
  const center = size / 2;
  const radius = (size - shape.thickness) / 2 - shape.amplitude;
  const full = arc.span >= Math.PI * 2 - 1e-6;
  const waves = Math.max(1, Math.round((arc.span * radius) / shape.wavelength));
  const amplitude = shape.amplitude * amplitudeScale;
  const sweep = (end - start) * arc.span;
  const activeStart = arc.start + start * arc.span;

  let active = "";
  if (end > start) {
    const steps = Math.max(8, Math.ceil((end - start) * waves * 16));
    for (let i = 0; i <= steps; i++) {
      const theta = activeStart + (sweep * i) / steps;
      const offset =
        amplitude * Math.sin((waves * (theta - arc.start) * Math.PI * 2) / arc.span + phase);
      const x = center + (radius + offset) * Math.cos(theta);
      const y = center + (radius + offset) * Math.sin(theta);
      active += `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`;
    }
  }

  const gapAngle = (shape.gap + shape.thickness) / radius;
  const empty = end <= start;
  let track = "";
  if (empty && full) {
    track = `M${fmt(center)} ${fmt(center - radius)}A${fmt(radius)} ${fmt(radius)} 0 1 1 ${fmt(center - 0.01)} ${fmt(center - radius)}`;
  } else {
    const trackStart = empty ? arc.start : activeStart + sweep + gapAngle;
    const trackEnd = full ? activeStart + arc.span - gapAngle : arc.start + arc.span;
    if (trackEnd > trackStart) {
      const large = trackEnd - trackStart > Math.PI ? 1 : 0;
      track = `M${polar(center, radius, trackStart)}A${fmt(radius)} ${fmt(radius)} 0 ${large} 1 ${polar(center, radius, trackEnd)}`;
    }
    if (!full && start > 0 && !empty) {
      const headEnd = activeStart - gapAngle;
      if (headEnd > arc.start) {
        const large = headEnd - arc.start > Math.PI ? 1 : 0;
        track += `M${polar(center, radius, arc.start)}A${fmt(radius)} ${fmt(radius)} 0 ${large} 1 ${polar(center, radius, headEnd)}`;
      }
    }
  }
  return { active, track };
}

export interface LinearPaths {
  active: string;
  track: string;
  /** Centre of the stop dot at the track's end, or null when the bar is full or indeterminate. */
  stop: { x: number; y: number } | null;
  height: number;
}

/**
 * Segments of a bar across `width`, left to right; the caller mirrors it for right-to-left. A
 * determinate bar is one segment from 0; an indeterminate one passes the moving segments, and the
 * track fills the gaps between them.
 */
export function linearPaths(
  width: number,
  segments: ReadonlyArray<readonly [start: number, end: number]>,
  shape: WaveShape,
  amplitudeScale: number,
  phase: number,
  stopIndicator = true,
): LinearPaths {
  const height = shape.thickness + shape.amplitude * 2;
  const middle = height / 2;
  const cap = shape.thickness / 2;
  const usable = width - shape.thickness;
  const amplitude = shape.amplitude * amplitudeScale;
  const k = (2 * Math.PI) / shape.wavelength;

  const visible = segments
    .map(([a, b]) => [clamp01(Math.min(a, b)), clamp01(Math.max(a, b))] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);

  let active = "";
  for (const [a, b] of visible) {
    const x0 = cap + usable * a;
    const x1 = cap + usable * b;
    const steps = Math.max(2, Math.ceil(((x1 - x0) / shape.wavelength) * 16));
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = middle + amplitude * Math.sin(k * x + phase);
      active += `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`;
    }
  }

  const reserve = shape.gap + shape.thickness;
  let track = "";
  let cursor = cap;
  let leading = true;
  for (const [a, b] of visible) {
    const x0 = cap + usable * a;
    const x1 = cap + usable * b;
    const trackEnd = x0 - reserve;
    const trackStart = leading ? cursor : cursor + reserve;
    if (trackEnd > trackStart)
      track += `M${fmt(trackStart)} ${fmt(middle)}L${fmt(trackEnd)} ${fmt(middle)}`;
    cursor = x1;
    leading = false;
  }
  const tailStart = leading ? cursor : cursor + reserve;
  const tailEnd = width - cap;
  if (tailEnd > tailStart)
    track += `M${fmt(tailStart)} ${fmt(middle)}L${fmt(tailEnd)} ${fmt(middle)}`;

  const last = visible.at(-1);
  const full = last !== undefined && last[1] >= 1;
  return {
    active,
    track,
    stop: stopIndicator && !full ? { x: width - LINEAR_STOP_SIZE / 2, y: middle } : null,
    height,
  };
}
