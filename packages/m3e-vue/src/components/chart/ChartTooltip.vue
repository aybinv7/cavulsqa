<script setup lang="ts">
/** The values at the touched point, in an inverse-surface tip that flips to stay on screen. */
const props = defineProps<{
  x: number;
  flip: boolean;
  title: string;
  rows: readonly { label: string; color: string; value: string }[];
}>();
</script>

<template>
  <div
    class="chart-tooltip"
    :class="{ 'chart-tooltip--flip': props.flip }"
    :style="{ left: `${props.x}px` }"
    aria-hidden="true"
  >
    <span class="chart-tooltip__title">{{ props.title }}</span>
    <span v-for="row in props.rows" :key="row.label" class="chart-tooltip__row">
      <span class="chart-tooltip__swatch" :style="{ background: row.color }" />{{ row.label }}
      <strong>{{ row.value }}</strong>
    </span>
  </div>
</template>

<style scoped>
.chart-tooltip {
  position: absolute;
  top: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: var(--md-sys-elevation-level2);
  translate: 12px 0;
  pointer-events: none;
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.chart-tooltip--flip {
  translate: calc(-100% - 12px) 0;
}

.chart-tooltip__title {
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
}

.chart-tooltip__row {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.chart-tooltip__row strong {
  margin-inline-start: auto;
  padding-inline-start: 12px;
  font-variant-numeric: tabular-nums;
}

.chart-tooltip__swatch {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
</style>
