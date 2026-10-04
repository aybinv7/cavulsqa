<script setup lang="ts">
/** The key under a chart: a colour mark and a label per series, with an optional value. */
const props = defineProps<{
  items: readonly { label: string; color: string; value?: string; dimmed?: boolean }[];
}>();
const emit = defineEmits<{ select: [index: number] }>();
</script>

<template>
  <ul class="chart-legend">
    <li
      v-for="(item, index) in props.items"
      :key="index"
      class="chart-legend__item"
      :class="{ 'chart-legend__item--dimmed': item.dimmed }"
      @click="emit('select', index)"
    >
      <span class="chart-legend__mark" :style="{ background: item.color }" aria-hidden="true" />
      <span class="chart-legend__label">{{ item.label }}</span>
      <span v-if="item.value" class="chart-legend__value">{{ item.value }}</span>
    </li>
  </ul>
</template>

<style scoped>
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.chart-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  cursor: pointer;
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.chart-legend__item--dimmed {
  opacity: 0.45;
}

.chart-legend__mark {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.chart-legend__value {
  color: var(--md-sys-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
}
</style>
