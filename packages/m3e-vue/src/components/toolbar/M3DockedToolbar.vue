<script setup lang="ts">
/**
 * The docked toolbar: a full-width 64dp bar at the bottom edge for a screen's actions, padding
 * itself for the gesture area. Items spread evenly between 16dp margins.
 *
 * @see https://m3.material.io/components/toolbars/specs
 */
const props = withDefaults(defineProps<{ variant?: "standard" | "vibrant"; label?: string }>(), {
  variant: "standard",
});
</script>

<template>
  <div
    class="m3-docked-toolbar"
    :class="`m3-docked-toolbar--${props.variant}`"
    role="toolbar"
    :aria-label="props.label"
  >
    <slot />
  </div>
</template>

<style scoped>
.m3-docked-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  box-sizing: content-box;
  height: 64px;
  padding: 0 16px env(safe-area-inset-bottom);
}

.m3-docked-toolbar--standard {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
}

.m3-docked-toolbar--vibrant {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}
</style>
