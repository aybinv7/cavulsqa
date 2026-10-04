<script setup lang="ts">
import { computed } from "vue";

/**
 * Lines of placeholder text set in a type scale, so they take the height the real text will: each
 * line is the scale's line height, with a bar as tall as its font size. Widths vary a little and
 * the last line of a paragraph stops short, as a paragraph does. Place it inside `M3Skeleton`.
 */
type Typescale =
  | "display-small"
  | "headline-small"
  | "title-large"
  | "title-medium"
  | "body-large"
  | "body-medium"
  | "body-small"
  | "label-large";

const props = withDefaults(
  defineProps<{ lines?: number; typescale?: Typescale; width?: string }>(),
  {
    lines: 3,
    typescale: "body-medium",
  },
);

const WIDTHS = [100, 94, 97, 89, 95];

const rows = computed(() =>
  Array.from({ length: Math.max(1, props.lines) }, (_, index) => {
    const last = index === props.lines - 1 && props.lines > 1;
    return last ? 62 : WIDTHS[index % WIDTHS.length]!;
  }),
);

const style = computed(() => ({
  "--m3-skeleton-size": `var(--md-sys-typescale-${props.typescale}-size)`,
  "--m3-skeleton-line": `var(--md-sys-typescale-${props.typescale}-line-height)`,
  width: props.width,
}));
</script>

<template>
  <span class="m3-skeleton-text" :style="style">
    <span v-for="(row, index) in rows" :key="index" class="m3-skeleton-text__line"
      ><span class="m3-skeleton-text__bar" :style="{ width: `${row}%` }"
    /></span>
  </span>
</template>

<style scoped>
.m3-skeleton-text {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.m3-skeleton-text__line {
  display: flex;
  align-items: center;
  height: var(--m3-skeleton-line);
}

.m3-skeleton-text__bar {
  height: calc(var(--m3-skeleton-size) * 0.8);
  border-radius: 4px;
  background: var(--md-sys-color-surface-container-highest);
}
</style>
