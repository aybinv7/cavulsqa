<script setup lang="ts">
/** Gridlines and value labels across the plot, and the category labels under it. */
const props = defineProps<{
  ticks: readonly { y: number; text: string; zero: boolean }[];
  left: number;
  right: number;
  categories: readonly { x: number; text: string; anchor: "start" | "middle" | "end" }[];
  baseline: number;
}>();
</script>

<template>
  <g class="chart-axes">
    <template v-for="tick in props.ticks" :key="tick.y">
      <line
        :x1="props.left"
        :x2="props.right"
        :y1="tick.y"
        :y2="tick.y"
        :class="{ 'chart-axes__zero': tick.zero }"
      />
      <text class="chart-axes__y" :x="props.left - 8" :y="tick.y">{{ tick.text }}</text>
    </template>
    <text
      v-for="category in props.categories"
      :key="category.x"
      class="chart-axes__x"
      :x="category.x"
      :y="props.baseline"
      :text-anchor="category.anchor"
    >
      {{ category.text }}
    </text>
  </g>
</template>

<style scoped>
.chart-axes line {
  stroke: var(--md-sys-color-outline-variant);
  stroke-width: 1;
}

.chart-axes .chart-axes__zero {
  stroke: var(--md-sys-color-outline);
}

.chart-axes__y,
.chart-axes__x {
  fill: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) / 1
    var(--md-sys-typescale-label-small-font);
  font-variant-numeric: tabular-nums;
}

.chart-axes__y {
  dominant-baseline: middle;
  text-anchor: end;
}
</style>
