<script setup lang="ts">
import M3WheelColumn from "./M3WheelColumn.vue";
import type { WheelColumn, WheelValue } from "./types.js";

/**
 * Framework7's picker in Material dress: side-by-side drums over one selection band, for values
 * that read better spun than typed - a date on a sheet, a duration, a quantity. The rows fade out
 * under two gradients in `--m3-wheel-surface` - set it to the colour behind the picker - rather
 * than a mask, which would make the browser repaint the scrolling layer on every frame. `v-model` holds one
 * value per column, keyed by the column's `key`; separators between columns go in `columns` as
 * single-option columns or in CSS.
 */
const props = withDefaults(
  defineProps<{
    columns: readonly WheelColumn[];
    itemHeight?: number;
    rows?: number;
    label?: string;
  }>(),
  { itemHeight: 40, rows: 7 },
);

const model = defineModel<Record<string, WheelValue>>({ default: () => ({}) });

function update(key: string, value: WheelValue | undefined) {
  if (value === undefined || model.value[key] === value) return;
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div
    class="m3-wheel-picker"
    role="group"
    :aria-label="props.label"
    :style="{ '--m3-wheel-item': `${props.itemHeight}px` }"
  >
    <span class="m3-wheel-picker__band" aria-hidden="true" />
    <M3WheelColumn
      v-for="column in props.columns"
      :key="column.key"
      :model-value="model[column.key]"
      :options="column.options"
      :label="column.label"
      :item-height="props.itemHeight"
      :rows="props.rows"
      :align="column.align"
      :loop="column.loop"
      :style="{ flex: column.flex ?? 1 }"
      @update:model-value="update(column.key, $event)"
    />
  </div>
</template>

<style scoped>
.m3-wheel-picker {
  position: relative;
  display: flex;
  gap: 4px;
  padding-inline: 16px;
}

.m3-wheel-picker::before,
.m3-wheel-picker::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  z-index: 2;
  height: 32%;
  pointer-events: none;
}

.m3-wheel-picker::before {
  top: 0;
  background: linear-gradient(
    var(--m3-wheel-surface, var(--md-sys-color-surface-container-low)),
    transparent
  );
}

.m3-wheel-picker::after {
  bottom: 0;
  background: linear-gradient(
    transparent,
    var(--m3-wheel-surface, var(--md-sys-color-surface-container-low))
  );
}

.m3-wheel-picker > :deep(.m3-wheel-column) {
  min-width: 0;
}

.m3-wheel-picker__band {
  position: absolute;
  inset-inline: 16px;
  top: 50%;
  height: var(--m3-wheel-item);
  translate: 0 -50%;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-highest);
  pointer-events: none;
}
</style>
