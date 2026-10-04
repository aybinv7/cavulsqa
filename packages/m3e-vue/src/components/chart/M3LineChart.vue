<script setup lang="ts">
import ChartAxes from "./ChartAxes.vue";
import ChartLegend from "./ChartLegend.vue";
import ChartTable from "./ChartTable.vue";
import ChartTooltip from "./ChartTooltip.vue";
import { computed, useId, useTemplateRef, watch } from "vue";
import { useChartScrub } from "../../composables/useChartScrub.js";
import { useElementSize } from "../../composables/useElementSize.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { areaPath, linePath, niceScale, visibleLabels, type Point } from "../../utils/chart.js";
import { seriesColor, type ChartSeries } from "./palette.js";

/**
 * A line chart - or with `area`, the lines filled down to zero - for how values move over time:
 * sales by week, visits by month. Lines bend smoothly without inventing peaks between points; a
 * missing value (`null`) breaks the line. Touching or hovering shows every series' value at that
 * point, and the arrow keys do the same with focus. The lines draw in once. Screen readers get the
 * numbers as a table.
 *
 * @see https://m3.material.io/foundations/data-visualization
 */
const props = withDefaults(
  defineProps<{
    labels: readonly string[];
    series: readonly ChartSeries[];
    label: string;
    height?: number;
    area?: boolean;
    smooth?: boolean;
    format?: (value: number) => string;
  }>(),
  { height: 240, area: false, smooth: true },
);

const host = useTemplateRef<HTMLElement>("host");
const svg = useTemplateRef<SVGSVGElement>("svg");
const { width } = useElementSize(host);
const reduced = useReducedMotion();
const id = useId();
const PAD = { top: 12, right: 12, bottom: 28, left: 48 };

const text = (value: number | null) =>
  value === null ? "" : props.format ? props.format(value) : value.toLocaleString();

const scale = computed(() =>
  niceScale(props.series.flatMap((s) => s.values.filter((v): v is number => v !== null))),
);
const plot = computed(() => ({
  left: PAD.left,
  top: PAD.top,
  width: Math.max(1, width.value - PAD.left - PAD.right),
  height: Math.max(1, props.height - PAD.top - PAD.bottom),
}));
const step = computed(() => plot.value.width / Math.max(1, props.labels.length - 1));
const xOf = (index: number) => plot.value.left + index * step.value;
const yOf = (value: number) => {
  const { min, max } = scale.value;
  return plot.value.top + (1 - (value - min) / (max - min || 1)) * plot.value.height;
};

const lines = computed(() =>
  props.series.map((series, index) => {
    const runs: Point[][] = [];
    let run: Point[] = [];
    series.values.forEach((value, at) => {
      if (value === null) {
        if (run.length) runs.push(run);
        run = [];
      } else run.push({ x: xOf(at), y: yOf(value) });
    });
    if (run.length) runs.push(run);
    const baseline = yOf(Math.max(scale.value.min, Math.min(0, scale.value.max)));
    return {
      color: seriesColor(index, series.color),
      line: runs.map((points) => linePath(points, props.smooth)).join(""),
      area: runs.map((points) => areaPath(points, props.smooth, baseline)).join(""),
    };
  }),
);

const ticks = computed(() =>
  scale.value.ticks.map((tick) => ({ y: yOf(tick), text: text(tick), zero: tick === 0 })),
);
const categories = computed(() =>
  visibleLabels(props.labels.length, plot.value.width, 56).map((index) => ({
    x: xOf(index),
    text: props.labels[index] ?? "",
    anchor: (index === 0 ? "start" : index === props.labels.length - 1 ? "end" : "middle") as
      | "start"
      | "middle"
      | "end",
  })),
);

const { active, handlers } = useChartScrub({
  target: svg,
  count: () => props.labels.length,
  indexAt: (x) => {
    if (props.labels.length === 0) return -1;
    const index = Math.round((x - plot.value.left) / step.value);
    return Math.min(props.labels.length - 1, Math.max(0, index));
  },
});

const focus = computed(() => {
  if (active.value < 0) return null;
  const x = xOf(active.value);
  return {
    x,
    flip: x > width.value / 2,
    title: props.labels[active.value] ?? "",
    rows: props.series.map((series, index) => {
      const value = series.values[active.value] ?? null;
      return {
        label: series.label,
        color: seriesColor(index, series.color),
        value: text(value),
        y: value === null ? null : yOf(value),
      };
    }),
  };
});

const legend = computed(() =>
  props.series.map((series, index) => ({
    label: series.label,
    color: seriesColor(index, series.color),
  })),
);
const tableRows = computed(() =>
  props.labels.map((label, at) => ({
    label,
    cells: props.series.map((series) => text(series.values[at] ?? null)),
  })),
);

let drawn = false;
watch(
  svg,
  (element) => {
    if (!element || drawn || reduced.value) return;
    drawn = true;
    element.querySelectorAll<SVGPathElement>(".m3-line-chart__line").forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      requestAnimationFrame(() => {
        path.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.05, 0.7, 0.1, 1)";
        path.style.strokeDashoffset = "0";
        path.addEventListener(
          "transitionend",
          () => {
            path.style.strokeDasharray = "";
            path.style.strokeDashoffset = "";
            path.style.transition = "";
          },
          { once: true },
        );
      });
    });
  },
  { flush: "post" },
);
</script>

<template>
  <figure class="m3-chart">
    <div ref="host" class="m3-chart__plot" :style="{ height: `${props.height}px` }">
      <svg
        v-if="width > 0"
        ref="svg"
        class="m3-chart__svg"
        :width="width"
        :height="props.height"
        :viewBox="`0 0 ${width} ${props.height}`"
        role="img"
        :aria-label="props.label"
        tabindex="0"
        @pointerdown="handlers.onPointerDown"
        @pointermove="handlers.onPointerMove"
        @pointerleave="handlers.onPointerLeave"
        @pointerup="handlers.onPointerUp"
        @keydown="handlers.onKeydown"
        @blur="active = -1"
      >
        <defs>
          <linearGradient
            v-for="(line, index) in lines"
            :id="`${id}-fill-${index}`"
            :key="index"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" :stop-color="line.color" stop-opacity="0.28" />
            <stop offset="1" :stop-color="line.color" stop-opacity="0" />
          </linearGradient>
        </defs>
        <ChartAxes
          :ticks="ticks"
          :left="plot.left"
          :right="plot.left + plot.width"
          :categories="categories"
          :baseline="props.height - 8"
        />
        <g v-for="(line, index) in lines" :key="index">
          <path v-if="props.area" :d="line.area" :fill="`url(#${id}-fill-${index})`" />
          <path class="m3-line-chart__line" :d="line.line" :stroke="line.color" />
        </g>
        <g v-if="focus" class="m3-chart__focus">
          <line :x1="focus.x" :x2="focus.x" :y1="plot.top" :y2="plot.top + plot.height" />
          <template v-for="row in focus.rows" :key="row.label">
            <circle v-if="row.y !== null" :cx="focus.x" :cy="row.y" r="5" :fill="row.color" />
          </template>
        </g>
      </svg>
      <ChartTooltip
        v-if="focus"
        :x="focus.x"
        :flip="focus.flip"
        :title="focus.title"
        :rows="focus.rows"
      />
    </div>
    <ChartLegend v-if="props.series.length > 1" :items="legend" />
    <ChartTable
      :caption="props.label"
      :columns="props.series.map((s) => s.label)"
      :rows="tableRows"
    />
  </figure>
</template>

<style scoped>
.m3-chart {
  margin: 0;
}

.m3-chart__plot {
  position: relative;
}

.m3-chart__svg {
  display: block;
  overflow: visible;
  touch-action: pan-y;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-chart__svg:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: 4px;
  border-radius: 8px;
}

.m3-line-chart__line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.m3-chart__focus line {
  stroke: var(--md-sys-color-on-surface-variant);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.m3-chart__focus circle {
  stroke: var(--md-sys-color-surface);
  stroke-width: 2;
}
</style>
