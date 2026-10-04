const WINDOW_MS = 100;

/**
 * Release velocity from the last 100 ms of samples, in px per second. A single last-two-points
 * difference is noise on a phone; a short window is what Android's VelocityTracker approximates.
 */
export function createVelocityTracker() {
  const samples: Array<{ t: number; y: number }> = [];
  return {
    reset() {
      samples.length = 0;
    },
    add(y: number, t: number = performance.now()) {
      samples.push({ t, y });
      while (samples.length > 2 && t - samples[0]!.t > WINDOW_MS) samples.shift();
    },
    velocity(): number {
      if (samples.length < 2) return 0;
      const first = samples[0]!;
      const last = samples.at(-1)!;
      const dt = last.t - first.t;
      return dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0;
    },
  };
}
