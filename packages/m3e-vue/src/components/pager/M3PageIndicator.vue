<script setup lang="ts">
import { computed } from "vue";

/**
 * Page dots for a pager or carousel. The current page's dot stretches into a pill in the primary
 * colour, and while the pages move it follows `progress` - a fractional page - so the pill slides
 * between dots with the finger instead of jumping when the page settles. Each dot is a button that
 * emits `select`; its touch target is larger than the dot.
 */
const props = withDefaults(
  defineProps<{
    count: number;
    progress: number;
    label?: string;
    pageLabel?: (page: number) => string;
  }>(),
  { label: "Pages", pageLabel: (page: number) => `Page ${page}` },
);

const emit = defineEmits<{ select: [index: number] }>();

const dots = computed(() =>
  Array.from({ length: props.count }, (_, index) => ({
    index,
    active: Math.max(0, Math.min(1, 1 - Math.abs(props.progress - index))),
  })),
);
const current = computed(() => Math.round(props.progress));
</script>

<template>
  <div class="m3-page-indicator" role="group" :aria-label="props.label">
    <button
      v-for="dot in dots"
      :key="dot.index"
      type="button"
      class="m3-page-indicator__dot"
      :style="{ '--m3-dot-active': dot.active }"
      :aria-label="props.pageLabel(dot.index + 1)"
      :aria-current="dot.index === current ? 'step' : undefined"
      @click="emit('select', dot.index)"
    >
      <span class="m3-page-indicator__mark" />
    </button>
  </div>
</template>

<style scoped>
.m3-page-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.m3-page-indicator__dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 24px;
  height: 24px;
  margin: 0;
  padding: 0 4px;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.m3-page-indicator__mark {
  display: block;
  width: calc(8px + 16px * var(--m3-dot-active));
  height: 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background: color-mix(
    in srgb,
    var(--md-sys-color-primary) calc(var(--m3-dot-active) * 100%),
    var(--md-sys-color-outline-variant)
  );
}

.m3-page-indicator__dot:focus-visible {
  outline: none;
}

.m3-page-indicator__dot:focus-visible .m3-page-indicator__mark {
  outline: 2px solid var(--md-sys-color-secondary);
  outline-offset: 2px;
}
</style>
