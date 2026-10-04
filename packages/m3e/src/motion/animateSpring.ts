import { springState, type SpringSpec } from "./spring.js";

export interface SpringAnimation {
  /** Where the animation is now, in the caller's units. */
  readonly value: number;
  /** Moves the target without a jump: the current position and velocity carry into the new spring. */
  retarget(to: number): void;
  /** Stops at the current position without calling `onEnd`. */
  stop(): void;
  readonly finished: Promise<boolean>;
}

export interface AnimateSpringOptions {
  from: number;
  to: number;
  spring: SpringSpec;
  /** Units per second, e.g. a drag's release velocity. */
  velocity?: number;
  onFrame: (value: number) => void;
  /** Distance from the target, in the caller's units, under which the spring is at rest. */
  restDelta?: number;
  /** Skips motion entirely: one frame at `to`. Pass the reduced-motion preference here. */
  instant?: boolean;
  frame?: (callback: (time: number) => void) => number;
  cancelFrame?: (handle: number) => void;
}

/**
 * A spring driven on animation frames, for moves that a gesture starts or that may be interrupted -
 * the cases where CSS transitions restart from zero velocity and visibly stutter.
 */
export function animateSpring(options: AnimateSpringOptions): SpringAnimation {
  const frame =
    options.frame ?? ((callback: (time: number) => void) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((handle: number) => cancelAnimationFrame(handle));
  const restDelta = options.restDelta ?? 0.5;

  let from = options.from;
  let to = options.to;
  let velocity = options.velocity ?? 0;
  let value = from;
  let startedAt: number | null = null;
  let handle = 0;
  let settle: (done: boolean) => void = () => {};
  const finished = new Promise<boolean>((resolve) => (settle = resolve));

  const finish = (done: boolean) => {
    if (handle) cancelFrame(handle);
    handle = 0;
    settle(done);
  };

  const tick = (time: number) => {
    startedAt ??= time;
    const distance = to - from;
    if (distance === 0) {
      value = to;
      options.onFrame(value);
      finish(true);
      return;
    }
    const state = springState((time - startedAt) / 1000, options.spring, velocity / distance);
    value = from + distance * state.value;
    const speed = state.velocity * distance;
    if (Math.abs(to - value) < restDelta && Math.abs(speed) < restDelta * 10) {
      value = to;
      options.onFrame(value);
      finish(true);
      return;
    }
    options.onFrame(value);
    handle = frame(tick);
  };

  if (options.instant) {
    value = to;
    options.onFrame(value);
    settle(true);
  } else {
    handle = frame(tick);
  }

  return {
    get value() {
      return value;
    },
    retarget(next: number) {
      if (options.instant) {
        value = to = next;
        options.onFrame(value);
        return;
      }
      const now = performance.now();
      const distance = to - from;
      if (startedAt !== null && distance !== 0) {
        velocity =
          springState((now - startedAt) / 1000, options.spring, velocity / distance).velocity *
          distance;
      }
      from = value;
      to = next;
      startedAt = null;
      cancelFrame(handle);
      handle = frame(tick);
    },
    stop() {
      finish(false);
    },
    finished,
  };
}
