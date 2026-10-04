<script setup lang="ts">
import ChartAxes from "./ChartAxes.vue";
import ChartLegend from "./ChartLegend.vue";
import ChartTable from "./ChartTable.vue";
import ChartTooltip from "./ChartTooltip.vue";
import { computed, useTemplateRef } from "vue";
import { useChartScrub } from "../../composables/useChartScrub.js";
import { useElementSize } from "../../composables/useElementSize.js";
import { niceScale, visibleLabels } from "../../utils/chart.js";
import { seriesColor, type ChartSeries } from "./palette.js";

/**
 * A bar chart for comparing amounts across categories - sales per rep, stock per warehouse. Series
 * stand side by side, or `stacked` one on another with a small gap between segments. Bars round
 * off at the end away from zero and grow in from it. Touching a category shows its values and
 * dims the rest; the arrow keys do the same with focus. Screen readers get the numbers as a table.
 *
 * @see https://m3.material.io/foundations/data-visualization
 */
const props = withDefaults(
  defineProps<{
    labels: readonly string[];
    series: readonly ChartSeries[];
    label: string;
    height?: number;
    stacked?: boolean;
    format?: (value: number) => string;
  }>(),
  { height: 240, stacked: false },
);

const host = useTemplateRef<HTMLElement>("host");
const svg = useTemplateRef<SVGSVGElement>("svg");
const { width } = useElementSize(host);
const PAD = { top: 12, right: 12, bottom: 28, left: 48 };
const STACK_GAP = 2;

const text = (value: number | null) =>
  value === null ? "" : props.format ? props.format(value) : value.toLocaleString();
const valueAt = (series: ChartSeries, index: number) => series.values[index] ?? 0;

const scale = computed(() => {
  if (!props.stacked) return niceScale(props.series.flatMap((s) => s.values.map((v) => v ?? 0)));
  const totals = props.labels.flatMap((_, index) => {
    const values = props.series.map((s) => valueAt(s, index) ?? 0);
    return [
      values.filter((v) => v > 0).reduce((sum, v) => sum + v, 0),
      values.filter((v) => v < 0).reduce((sum, v) => sum + v, 0),
    ];
  });
  return niceScale(totals);
});

const plot = computed(() => ({
  left: PAD.left,
  top: PAD.top,
  width: Math.max(1, width.value - PAD.left - PAD.right),
  height: Math.max(1, props.height - PAD.top - PAD.bottom),
}));
const group = computed(() => plot.value.width / Math.max(1, props.labels.length));
const yOf = (value: number) => {
  const { min, max } = scale.value;
  return plot.value.top + (1 - (value - min) / (max - min || 1)) * plot.value.height;
};
const zero = computed(() => yOf(Math.max(scale.value.min, Math.min(0, scale.value.max))));

function barPath(x: number, w: number, from: number, to: number, both: boolean): string {
  const top = Math.min(from, to);
  const bottom = Math.max(from, to);
  const h = bottom - top;
  if (h <= 0 || w <= 0) return "";
  const r = Math.min(both ? 4 : 8, w / 2, both ? h / 2 : h);
  const up = to <= from;
  const roundTop = both || up;
  const roundBottom = both || !up;
  const tr = roundTop ? r : 0;
  const br = roundBottom ? r : 0;
  return (
    `M${x},${top + tr}` +
    (tr ? `A${tr},${tr} 0 0 1 ${x + tr},${top}` : "") +
    `H${x + w - tr}` +
    (tr ? `A${tr},${tr} 0 0 1 ${x + w},${top + tr}` : "") +
    `V${bottom - br}` +
    (br ? `A${br},${br} 0 0 1 ${x + w - br},${bottom}` : "") +
    `H${x + br}` +
    (br ? `A${br},${br} 0 0 1 ${x},${bottom - br}` : "") +
    "Z"
  );
}

const bars = computed(() => {
  const count = props.series.length;
  const g = group.value;
  return props.labels.flatMap((_, category) => {
    const start = plot.value.left + category * g;
    if (props.stacked) {
      const w = Math.min(48, g * 0.5);
      const x = start + (g - w) / 2;
      let positive = 0;
      let negative = 0;
      return props.series.map((series, index) => {
        const value = valueAt(series, category) ?? 0;
        const base = value >= 0 ? positive : negative;
        const end = base + value;
        if (value >= 0) positive = end;
        else negative = end;
        const from = yOf(base) - (base === 0 ? 0 : value >= 0 ? STACK_GAP : -STACK_GAP);
        return {
          category,
          negative: value < 0,
          color: seriesColor(index, series.color),
          d: barPath(x, w, from, yOf(end), true),
        };
      });
    }
    const inner = Math.min(g * 0.7, count * 32);
    const w = inner / Math.max(1, count) - (count > 1 ? 2 : 0);
    const x0 = start + (g - inner) / 2;
    return props.series.map((series, index) => {
      const value = valueAt(series, category) ?? 0;
      return {
        category,
        negative: value < 0,
        color: seriesColor(index, series.color),
        d: barPath(x0 + index * (w + (count > 1 ? 2 : 0)), w, zero.value, yOf(value), false),
      };
    });
  });
});

const ticks = computed(() =>
  scale.value.ticks.map((tick) => ({ y: yOf(tick), text: text(tick), zero: tick === 0 })),
);
const categories = computed(() =>
  visibleLabels(props.labels.length, plot.value.width, 48).map((index) => ({
    x: plot.value.left + (index + 0.5) * group.value,
    text: props.labels[index] ?? "",
    anchor: "middle" as const,
  })),
);

const { active, handlers } = useChartScrub({
  target: svg,
  count: () => props.labels.length,
  indexAt: (x) => {
    const index = Math.floor((x - plot.value.left) / group.value);
    return index >= 0 && index < props.labels.length ? index : -1;
  },
});

const focus = computed(() => {
  if (active.value < 0) return null;
  const x = plot.value.left + (active.value + 0.5) * group.value;
  return {
    x,
    flip: x > width.value / 2,
    title: props.labels[active.value] ?? "",
    rows: props.series.map((series, index) => ({
      label: series.label,
      color: seriesColor(index, series.color),
      value: text(series.values[active.value] ?? null),
    })),
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
        <ChartAxes
          :ticks="ticks"
          :left="plot.left"
          :right="plot.left + plot.width"
          :categories="categories"
          :baseline="props.height - 8"
        />
        <path
          v-for="(bar, index) in bars"
          :key="index"
          class="m3-bar-chart__bar"
          :class="{
            'm3-bar-chart__bar--negative': bar.negative,
            'm3-bar-chart__bar--dimmed': active >= 0 && bar.category !== active,
          }"
          :d="bar.d"
          :fill="bar.color"
        />
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

.m3-bar-chart__bar {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: m3-bar-grow 700ms cubic-bezier(0.05, 0.7, 0.1, 1) both;
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-bar-chart__bar--negative {
  transform-origin: 50% 0;
}

.m3-bar-chart__bar--dimmed {
  opacity: 0.4;
}

@keyframes m3-bar-grow {
  from {
    transform: scaleY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-bar-chart__bar {
    animation: none;
  }
}
</style>
