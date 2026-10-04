import { describe, expect, it } from "vite-plus/test";
import {
  dialAngle,
  dialHandle,
  dialLabels,
  dialValueAt,
  DIAL_SIZE,
} from "../src/utils/clockDial.js";

const at = (angle: number, radius: number) => {
  const radians = (angle * Math.PI) / 180;
  return [
    DIAL_SIZE / 2 + radius * Math.sin(radians),
    DIAL_SIZE / 2 - radius * Math.cos(radians),
  ] as const;
};

describe("clock dial", () => {
  it("places twelve at the top and three on the right", () => {
    const labels = dialLabels("hour", false, DIAL_SIZE, String);
    const twelve = labels.find((l) => l.value === 12)!;
    const three = labels.find((l) => l.value === 3)!;
    expect(twelve.x).toBeCloseTo(128);
    expect(twelve.y).toBeCloseTo(27);
    expect(three.x).toBeCloseTo(229);
    expect(three.y).toBeCloseTo(128);
  });

  it("puts 00 and 13-23 on the inner ring of a 24-hour dial", () => {
    const labels = dialLabels("hour", true, DIAL_SIZE, (v) => String(v).padStart(2, "0"));
    expect(labels).toHaveLength(24);
    expect(labels.filter((l) => l.inner).map((l) => l.value)).toEqual([
      0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ]);
    expect(dialHandle(0, "hour", true, DIAL_SIZE).radius).toBeCloseTo(69);
    expect(dialHandle(12, "hour", true, DIAL_SIZE).radius).toBeCloseTo(101);
  });

  it("reads hours from the ring under the finger", () => {
    expect(dialValueAt(...at(90, 101), DIAL_SIZE, "hour", true)).toBe(3);
    expect(dialValueAt(...at(90, 69), DIAL_SIZE, "hour", true)).toBe(15);
    expect(dialValueAt(...at(0, 69), DIAL_SIZE, "hour", true)).toBe(0);
    expect(dialValueAt(...at(0, 101), DIAL_SIZE, "hour", true)).toBe(12);
  });

  it("keeps a twelve-hour dial in its half of the day", () => {
    expect(dialValueAt(...at(90, 101), DIAL_SIZE, "hour", false)).toBe(3);
    expect(dialValueAt(...at(90, 101), DIAL_SIZE, "hour", false, { pm: true })).toBe(15);
    expect(dialValueAt(...at(0, 101), DIAL_SIZE, "hour", false, { pm: true })).toBe(12);
  });

  it("reads minutes to the minute while dragging and to the five on a tap", () => {
    expect(dialValueAt(...at(42, 101), DIAL_SIZE, "minute", false)).toBe(7);
    expect(dialValueAt(...at(42, 101), DIAL_SIZE, "minute", false, { snapFive: true })).toBe(5);
    expect(dialValueAt(...at(359, 101), DIAL_SIZE, "minute", false)).toBe(0);
    expect(dialAngle(45, "minute", false).angle).toBe(270);
  });
});
