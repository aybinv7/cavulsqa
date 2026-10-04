import {
  AMPLITUDE_FADE_MS,
  EASING,
  PROGRESS_GLIDE_MS,
  WAVE_PERIOD_MS,
  cubicBezier,
  waveAmplitudeFor,
} from "@cavulsqa/m3e";

const rise = cubicBezier(EASING.standard);
const fall = cubicBezier(EASING.emphasizedAccelerate);

export interface WaveSample {
  progress: number;
  amplitude: number;
  phase: number;
  /** Nothing is moving: a frame loop can stop until the inputs change. */
  settled: boolean;
}

/**
 * The time-varying part of a wavy indicator: progress glides to a new value linearly, the wave's
 * amplitude fades in on `standard` and out on `emphasizedAccelerate` as progress crosses 10% and
 * 95%, and the wave travels one wavelength per second. Pure state, sampled once per frame.
 */
export function createWaveMotion() {
  let from = 0;
  let to = 0;
  let glideStart = -Infinity;
  let ampFrom = 0;
  let ampTo = 0;
  let ampStart = -Infinity;
  let phaseOrigin = 0;
  let initialised = false;

  const progressAt = (now: number) => {
    const t = Math.min(1, (now - glideStart) / PROGRESS_GLIDE_MS);
    return from + (to - from) * t;
  };

  const amplitudeAt = (now: number) => {
    const t = Math.min(1, (now - ampStart) / AMPLITUDE_FADE_MS);
    const eased = ampTo > ampFrom ? rise(t) : fall(t);
    return ampFrom + (ampTo - ampFrom) * eased;
  };

  return {
    /** Sets the target. The first call jumps; later ones glide from wherever the bar is. */
    setTarget(value: number, now: number, wavy: boolean) {
      const clamped = Math.min(1, Math.max(0, value));
      const amplitude = wavy ? waveAmplitudeFor(clamped) : 0;
      if (!initialised) {
        initialised = true;
        from = to = clamped;
        ampFrom = ampTo = amplitude;
        phaseOrigin = now;
        return;
      }
      from = progressAt(now);
      to = clamped;
      glideStart = now;
      if (amplitude !== ampTo) {
        ampFrom = amplitudeAt(now);
        ampTo = amplitude;
        ampStart = now;
      }
    },
    sample(now: number): WaveSample {
      const amplitude = amplitudeAt(now);
      const gliding = now - glideStart < PROGRESS_GLIDE_MS;
      const fading = now - ampStart < AMPLITUDE_FADE_MS;
      return {
        progress: progressAt(now),
        amplitude,
        phase: -(((now - phaseOrigin) % WAVE_PERIOD_MS) / WAVE_PERIOD_MS) * Math.PI * 2,
        settled: !gliding && !fading && amplitude === 0,
      };
    },
  };
}
