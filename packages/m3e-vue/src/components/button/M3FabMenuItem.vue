<script setup lang="ts">
import { vRipple } from "../../directives/ripple.js";
import { useFabMenu } from "./fabMenuContext.js";

/**
 * One action of a FAB menu: a 56dp pill with an icon and a label. `index` counts from the item
 * nearest the FAB, which sets its place in the staggered entrance. Choosing it closes the menu.
 */
const props = withDefaults(defineProps<{ label: string; index?: number; disabled?: boolean }>(), {
  index: 0,
  disabled: false,
});

const emit = defineEmits<{ click: [event: MouseEvent] }>();
const menu = useFabMenu();

function onClick(event: MouseEvent) {
  emit("click", event);
  menu.close();
}
</script>

<template>
  <li
    class="m3-fab-menu-item"
    :class="`m3-fab-menu-item--${menu.color.value}`"
    :style="{ '--m3-fab-index': props.index }"
  >
    <button
      v-ripple
      type="button"
      class="m3-state m3-focus-ring"
      :disabled="props.disabled"
      @click="onClick"
    >
      <span class="m3-fab-menu-item__icon" aria-hidden="true"><slot /></span>
      <span>{{ props.label }}</span>
    </button>
  </li>
</template>

<style scoped>
.m3-fab-menu-item {
  opacity: 0;
  transform: translateY(16px) scale(0.6);
  transform-origin: 100% 100%;
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
  transition-delay: calc((var(--m3-fab-count, 1) - 1 - var(--m3-fab-index)) * 15ms);
}

:global(.m3-fab-menu--open .m3-fab-menu-item) {
  opacity: 1;
  transform: none;
  transition-delay: calc(var(--m3-fab-index) * 30ms);
}

button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 24px;
  border: 0;
  border-radius: 28px;
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
  white-space: nowrap;
  cursor: pointer;
}

.m3-fab-menu-item__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 24px;
}

.m3-fab-menu-item__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-fab-menu-item--primary button {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-fab-menu-item--secondary button {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-fab-menu-item--tertiary button {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}
</style>
