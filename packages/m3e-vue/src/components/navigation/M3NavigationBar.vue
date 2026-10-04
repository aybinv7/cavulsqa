<script setup lang="ts">
import { computed, provide, useTemplateRef } from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import { useHaptics } from "../../composables/services.js";
import { NAVIGATION } from "./context.js";

/**
 * The flexible navigation bar of M3 Expressive: 64dp instead of the old 80, items sharing the width
 * equally on compact windows, and from 600dp on, fixed-width items with the label beside the icon.
 * It pads itself for the gesture area. Bind the selected destination with `v-model`; tapping the
 * selected one again emits `reselect`, for scrolling to the top or popping to the root.
 *
 * @see https://m3.material.io/components/navigation-bar/specs
 */
const props = withDefaults(
  defineProps<{ label?: string; layout?: "auto" | "vertical" | "horizontal" }>(),
  {
    label: "Main",
    layout: "auto",
  },
);

const selected = defineModel<string>();
const emit = defineEmits<{ reselect: [value: string] }>();
const root = useTemplateRef<HTMLElement>("root");
const { width } = useElementSize(root);
const haptics = useHaptics();

const layout = computed(() => {
  if (props.layout !== "auto") return props.layout;
  return width.value >= 600 ? "horizontal" : "vertical";
});

provide(NAVIGATION, {
  selected,
  layout,
  select(value) {
    if (selected.value === value) {
      emit("reselect", value);
      return;
    }
    haptics.tick();
    selected.value = value;
  },
});
</script>

<template>
  <nav
    ref="root"
    class="m3-navigation-bar"
    :class="`m3-navigation-bar--${layout}`"
    :aria-label="props.label"
  >
    <slot />
  </nav>
</template>

<style scoped>
.m3-navigation-bar {
  display: flex;
  align-items: stretch;
  justify-content: center;
  box-sizing: content-box;
  height: 64px;
  padding: 0 0 env(safe-area-inset-bottom);
  background: var(--md-sys-color-surface-container);
}

.m3-navigation-bar--vertical > :deep(.m3-nav-item) {
  flex: 1 1 0;
  padding: 6px 0;
}

.m3-navigation-bar--horizontal {
  gap: 4px;
}

.m3-navigation-bar--horizontal > :deep(.m3-nav-item) {
  flex: 0 0 auto;
  min-width: 96px;
}
</style>
