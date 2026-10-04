<script setup lang="ts">
import { computed, provide } from "vue";
import { useHaptics } from "../../composables/services.js";
import { NAVIGATION } from "./context.js";

/**
 * The Expressive navigation rail for medium and larger windows: 96dp collapsed with icons over
 * labels, or expanded (220-360dp) with full-width items, the change animated as one component's two
 * states. `#header` holds the menu button and the FAB, above the destinations.
 *
 * @see https://m3.material.io/components/navigation-rail/specs
 */
const props = withDefaults(
  defineProps<{
    label?: string;
    expanded?: boolean;
    expandedWidth?: number;
    align?: "start" | "center";
    modal?: boolean;
  }>(),
  { label: "Main", expanded: false, expandedWidth: 256, align: "start", modal: false },
);

const selected = defineModel<string>();
const emit = defineEmits<{ reselect: [value: string] }>();
const haptics = useHaptics();
const layout = computed(() => (props.expanded ? "horizontal" : "vertical"));

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
    class="m3-navigation-rail"
    :class="{
      'm3-navigation-rail--expanded': props.expanded,
      'm3-navigation-rail--modal': props.modal,
    }"
    :style="{ '--m3-rail-expanded': `${Math.min(360, Math.max(220, props.expandedWidth))}px` }"
    :aria-label="props.label"
  >
    <div v-if="$slots.header" class="m3-navigation-rail__header"><slot name="header" /></div>
    <div class="m3-navigation-rail__items" :class="`m3-navigation-rail__items--${props.align}`">
      <slot />
    </div>
  </nav>
</template>

<style scoped>
.m3-navigation-rail {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: calc(96px + env(safe-area-inset-left));
  height: 100%;
  padding: max(16px, env(safe-area-inset-top)) 0 env(safe-area-inset-bottom);
  padding-inline-start: env(safe-area-inset-left);
  background: var(--md-sys-color-surface);
  overflow: hidden;
  transition: width var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-navigation-rail--expanded {
  width: calc(var(--m3-rail-expanded) + env(safe-area-inset-left));
}

.m3-navigation-rail--modal {
  border-start-end-radius: 16px;
  border-end-end-radius: 16px;
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2);
}

.m3-navigation-rail__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 20px 28px;
}

.m3-navigation-rail--expanded .m3-navigation-rail__header {
  align-items: flex-start;
}

.m3-navigation-rail__items {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.m3-navigation-rail__items--center {
  justify-content: center;
}

.m3-navigation-rail__items > :deep(.m3-nav-item--vertical) {
  padding: 6px 0;
}

.m3-navigation-rail--expanded .m3-navigation-rail__items {
  padding: 0 20px;
}

.m3-navigation-rail--expanded .m3-navigation-rail__items > :deep(.m3-nav-item) {
  align-items: stretch;
}

.m3-navigation-rail--expanded .m3-navigation-rail__items :deep(.m3-nav-item__indicator) {
  justify-content: flex-start;
  width: 100%;
  height: 56px;
  gap: 8px;
  box-sizing: border-box;
  border-radius: 28px;
}

.m3-navigation-rail--expanded .m3-navigation-rail__items :deep(.m3-nav-item__label) {
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
}
</style>
