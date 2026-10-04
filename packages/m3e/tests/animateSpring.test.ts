import { expect, test } from "vite-plus/test";
import { animateSpring } from "../src/motion/animateSpring.js";
import { MOTION_SCHEMES } from "../src/motion/tokens.js";

function manualFrames() {
  let time = 0;
  let queued: ((time: number) => void) | null = null;
  return {
    frame: (callback: (time: number) => void) => {
      queued = callback;
      return 1;
    },
    cancelFrame: () => {
      queued = null;
    },
    advance(ms: number) {
      time += ms;
      const callback = queued;
      queued = null;
      callback?.(time);
    },
    run(ms: number, step = 16) {
      for (let t = 0; t < ms; t += step) this.advance(step);
    },
    get pending() {
      return queued !== null;
    },
  };
}

const spring = MOTION_SCHEMES.expressive.defaultSpatial.spring;

test("a spring animation reaches its target exactly and resolves", async () => {
  const frames = manualFrames();
  const values: number[] = [];
  const animation = animateSpring({
    from: 0,
    to: 300,
    spring,
    onFrame: (v) => values.push(v),
    ...frames,
  });
  frames.run(2000);
  expect(values.at(-1)).toBe(300);
  expect(Math.max(...values)).toBeGreaterThan(300);
  expect(frames.pending).toBe(false);
  await expect(animation.finished).resolves.toBe(true);
});

test("retargeting keeps the position, with no jump", () => {
  const frames = manualFrames();
  const values: number[] = [];
  const animation = animateSpring({
    from: 0,
    to: 100,
    spring,
    onFrame: (v) => values.push(v),
    ...frames,
  });
  frames.run(96);
  const before = animation.value;
  animation.retarget(0);
  frames.advance(16);
  frames.advance(1);
  expect(Math.abs(values.at(-1)! - before)).toBeLessThan(5);
  frames.run(3000);
  expect(values.at(-1)).toBe(0);
});

test("instant animations write the target once and finish", async () => {
  const values: number[] = [];
  const animation = animateSpring({
    from: 0,
    to: 40,
    spring,
    instant: true,
    onFrame: (v) => values.push(v),
  });
  expect(values).toEqual([40]);
  await expect(animation.finished).resolves.toBe(true);
});

test("stop leaves the animation where it is", async () => {
  const frames = manualFrames();
  const animation = animateSpring({ from: 0, to: 100, spring, onFrame: () => {}, ...frames });
  frames.run(48);
  animation.stop();
  expect(frames.pending).toBe(false);
  await expect(animation.finished).resolves.toBe(false);
});
