<script setup lang="ts">
/** A segment of an Expressive menu: its own 16dp surface, 2dp from the next, with an optional label. */
const props = defineProps<{ label?: string }>();
</script>

<template>
  <div class="m3-menu-group" role="group" :aria-label="props.label">
    <span v-if="props.label" class="m3-menu-group__label">{{ props.label }}</span>
    <slot />
  </div>
</template>

<style scoped>
.m3-menu-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  border-radius: 16px;
  background: var(--md-sys-color-surface-container-low);
  box-shadow: var(--md-sys-elevation-level2);
}

:global(.m3-menu--vibrant .m3-menu-group) {
  background: var(--md-sys-color-tertiary-container);
}

.m3-menu-group__label {
  padding: 8px 12px 4px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}
</style>
