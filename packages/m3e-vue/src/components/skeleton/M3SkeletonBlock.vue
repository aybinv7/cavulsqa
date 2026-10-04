<script setup lang="ts">
import { computed } from "vue";

/**
 * One placeholder shape: `rounded` (12dp, a card or an image), `circle` (an avatar - `width` sets
 * both sides), `pill` (a button or a chip) or `square` (4dp, a thumbnail). Sizes take any CSS
 * length; a number is px. Place it inside `M3Skeleton`.
 */
const props = withDefaults(
  defineProps<{
    width?: number | string;
    height?: number | string;
    shape?: "rounded" | "circle" | "pill" | "square";
  }>(),
  { width: "100%", height: 16, shape: "rounded" },
);

const length = (value: number | string) => (typeof value === "number" ? `${value}px` : value);

const style = computed(() => ({
  width: length(props.width),
  height: props.shape === "circle" ? length(props.width) : length(props.height),
}));
</script>

<template>
  <span class="m3-skeleton-block" :class="`m3-skeleton-block--${props.shape}`" :style="style" />
</template>

<style scoped>
.m3-skeleton-block {
  display: block;
  flex: none;
  max-width: 100%;
  background: var(--md-sys-color-surface-container-highest);
}

.m3-skeleton-block--rounded {
  border-radius: 12px;
}

.m3-skeleton-block--square {
  border-radius: 4px;
}

.m3-skeleton-block--pill,
.m3-skeleton-block--circle {
  border-radius: 9999px;
}
</style>
