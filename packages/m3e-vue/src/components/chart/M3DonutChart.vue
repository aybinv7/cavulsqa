<script setup lang="ts">
import ChartLegend from "./ChartLegend.vue";
import ChartTable from "./ChartTable.vue";
import { computed, shallowRef } from "vue";
import { donutSegment, donutSpans } from "../../utils/chart.js";
import { seriesColor } from "./palette.js";

/**
 * A donut chart for how one whole divides - sales by channel, stock by category. Segments are set
 * apart by small gaps around a thick ring; the centre shows the total (`#center` replaces it, and
 * receives the touched segment). Touching a segment, or its legend entry, brings it forward and
 * puts it in the centre; the arrow keys step through them with focus. Keep it to a handful of
 * segments - past six, a bar chart reads better.
 *
 * @see https://m3.material.io/foundations/data-visualization
 */
const props = withDefaults(
  defineProps<{
    segments: readonly { label: string; value: number; color?: string }[];
    label: string;
    size?: number;
    thickness?: number;
    totalLabel?: string;
    format?: (value: number) => string;
  }>(),
  { size: 200, thickness: 32, totalLabel: "Total" },
);

defineSlots<{
  center?: (scope: { label: string; value: string; share: number | null }) => unknown;
}>();

const active = shallowRef(-1);
const GAP = 0.012;

const text = (value: number) => (props.format ? props.format(value) : value.toLocaleString());
const percent = (share: number) => `${Math.round(share * 100)}%`;
const total = computed(() => props.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0));
const spans = computed(() =>
  donutSpans(
    props.segments.map((s) => s.value),
    GAP,
  ),
);

const arcs = computed(() => {
  const center = { x: props.size / 2, y: props.size / 2 };
  const outer = props.size / 2 - 4;
  return props.segments.map((segment, index) => {
    const span = spans.value[index]!;
    const lift = index === active.value ? 4 : 0;
    return {
      color: seriesColor(index, segment.color),
      d:
        span.end > span.start
          ? donutSegment(center, outer + lift, outer - props.thickness, span.start, span.end)
          : "",
    };
  });
});

const centre = computed(() => {
  const segment = props.segments[active.value];
  if (!segment) return { label: props.totalLabel, value: text(total.value), share: null };
  return {
    label: segment.label,
    value: text(segment.value),
    share: spans.value[active.value]!.share,
  };
});

const legend = computed(() =>
  props.segments.map((segment, index) => ({
    label: segment.label,
    color: seriesColor(index, segment.color),
    value: `${text(segment.value)} · ${percent(spans.value[index]!.share)}`,
    dimmed: active.value >= 0 && active.value !== index,
  })),
);

const tableRows = computed(() =>
  props.segments.map((segment, index) => ({
    label: segment.label,
    cells: [text(segment.value), percent(spans.value[index]!.share)],
  })),
);

function select(index: number) {
  active.value = active.value === index ? -1 : index;
}

function onKeydown(event: KeyboardEvent) {
  const count = props.segments.length;
  if (count === 0) return;
  const moves: Record<string, number> = {
    ArrowRight: active.value + 1,
    ArrowDown: active.value + 1,
    ArrowLeft: active.value < 0 ? count - 1 : active.value - 1,
    ArrowUp: active.value < 0 ? count - 1 : active.value - 1,
  };
  if (event.key === "Escape") active.value = -1;
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  active.value = (next + count) % count;
}
</script>

<template>
  <figure class="m3-donut">
    <div class="m3-donut__ring" :style="{ width: `${props.size}px`, height: `${props.size}px` }">
      <svg
        :width="props.size"
        :height="props.size"
        :viewBox="`0 0 ${props.size} ${props.size}`"
        role="img"
        :aria-label="props.label"
        tabindex="0"
        class="m3-donut__svg"
        @keydown="onKeydown"
        @blur="active = -1"
      >
        <path
          v-for="(arc, index) in arcs"
          :key="index"
          class="m3-donut__segment"
          :class="{ 'm3-donut__segment--dimmed': active >= 0 && active !== index }"
          :d="arc.d"
          :fill="arc.color"
          @click="select(index)"
        />
      </svg>
      <div class="m3-donut__center" aria-hidden="true">
        <slot name="center" v-bind="centre">
          <span class="m3-donut__value">{{ centre.value }}</span>
          <span class="m3-donut__label">{{
            centre.share === null ? centre.label : `${centre.label} · ${percent(centre.share)}`
          }}</span>
        </slot>
      </div>
    </div>
    <ChartLegend :items="legend" @select="select" />
    <ChartTable :caption="props.label" :columns="[props.totalLabel, '%']" :rows="tableRows" />
  </figure>
</template>

<style scoped>
.m3-donut {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
}

.m3-donut__ring {
  position: relative;
}

.m3-donut__svg {
  display: block;
  overflow: visible;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transform-origin: 50% 50%;
  animation: m3-donut-in 800ms cubic-bezier(0.05, 0.7, 0.1, 1) both;
}

.m3-donut__svg:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: 4px;
  border-radius: 50%;
}

.m3-donut__segment {
  cursor: pointer;
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-donut__segment--dimmed {
  opacity: 0.35;
}

.m3-donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24%;
  text-align: center;
  pointer-events: none;
}

.m3-donut__value {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) /
    var(--md-sys-typescale-headline-small-line-height) var(--md-sys-typescale-headline-small-font);
  font-variant-numeric: tabular-nums;
}

.m3-donut__label {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

@keyframes m3-donut-in {
  from {
    opacity: 0;
    transform: rotate(-90deg) scale(0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-donut__svg {
    animation: none;
  }
}
</style>
