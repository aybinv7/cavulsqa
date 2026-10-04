import { describe, expect, test } from "vite-plus/test";
import {
  areaPath,
  donutSegment,
  donutSpans,
  linePath,
  niceScale,
  visibleLabels,
} from "../src/utils/chart.js";

describe("chart geometry", () => {
  test("the y axis takes round steps and includes zero", () => {
    expect(niceScale([12, 87, 43])).toEqual({
      min: 0,
      max: 100,
      step: 25,
      ticks: [0, 25, 50, 75, 100],
    });
    expect(niceScale([-30, 40]).ticks).toEqual([-40, -20, 0, 20, 40]);
    expect(niceScale([]).ticks.length).toBeGreaterThan(1);
  });

  test("labels thin evenly to fit", () => {
    expect(visibleLabels(12, 300, 50)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(visibleLabels(4, 300, 50)).toEqual([0, 1, 2, 3]);
  });

  test("the smooth line never leaves the band between two equal points", () => {
    const points = [
      { x: 0, y: 50 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 30, y: 60 },
    ];
    const d = linePath(points, true);
    const controls = [...d.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/g)];
    const flat = controls[1]!;
    expect(Number(flat[2])).toBe(10);
    expect(Number(flat[4])).toBe(10);
    expect(linePath(points, false)).toBe("M0,50L10,10L20,10L30,60");
    expect(areaPath(points, false, 100).endsWith("L30,100L0,100Z")).toBe(true);
  });

  test("donut spans share the turn after the gaps", () => {
    const spans = donutSpans([3, 1, 0], 0.01);
    expect(spans[0]!.share).toBe(0.75);
    expect(spans[1]!.start).toBeCloseTo(spans[0]!.end + 0.01);
    expect(spans[2]!.end - spans[2]!.start).toBe(0);
    expect(donutSegment({ x: 50, y: 50 }, 40, 30, 0, 0.25)).toBe(
      "M50,10A40,40 0 0 1 90,50L80,50A30,30 0 0 0 50,20Z",
    );
  });
});

describe("chart components", async () => {
  const { mount } = await import("@vue/test-utils");
  const { M3BarChart, M3DonutChart, createM3e } = await import("../src/index.js");
  const plugins = [createM3e({ reducedMotion: true })];

  test("every chart carries its numbers as a table for screen readers", () => {
    const bars = mount(M3BarChart, {
      props: {
        label: "Sales by rep",
        labels: ["Karim", "Samir"],
        series: [{ label: "Sept", values: [12, 30] }],
      },
      global: { plugins },
    });
    const table = bars.get("table");
    expect(table.get("caption").text()).toBe("Sales by rep");
    expect(table.findAll("tbody tr").map((row) => row.text())).toEqual(["Karim12", "Samir30"]);
  });

  test("the donut centre shows the total, then the touched segment and its share", async () => {
    const donut = mount(M3DonutChart, {
      props: {
        label: "Sales by channel",
        totalLabel: "Total",
        segments: [
          { label: "Shops", value: 75 },
          { label: "Online", value: 25 },
        ],
      },
      global: { plugins },
    });
    expect(donut.get(".m3-donut__center").text()).toContain("100");
    await donut.findAll(".m3-donut__segment")[1]!.trigger("click");
    expect(donut.get(".m3-donut__center").text()).toContain("Online · 25%");
    expect(donut.findAll(".m3-donut__segment--dimmed")).toHaveLength(1);
  });
});
