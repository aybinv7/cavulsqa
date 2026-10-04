<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, provide, useTemplateRef } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";
import { useOverlay } from "../../composables/useOverlay.js";
import { FAB_MENU, type FabMenuColor } from "./fabMenuContext.js";

/**
 * The FAB menu: the FAB turns into a close button and up to six actions spring out above it from
 * its corner, staggered. Tapping outside, Escape or Android back closes it. Put `M3FabMenuItem`s
 * in the default slot and the FAB's icon in `#icon`.
 *
 * @see https://m3.material.io/components/fab-menu/specs
 */
const props = withDefaults(
  defineProps<{ label: string; closeLabel?: string; color?: FabMenuColor }>(),
  { closeLabel: "Close", color: "primary" },
);

const open = defineModel<boolean>("open", { default: false });
const haptics = useHaptics();
const list = useTemplateRef<HTMLElement>("list");

useOverlay({ open, dismissible: true, onClose: () => (open.value = false) });
provide(FAB_MENU, { color: computed(() => props.color), close: () => (open.value = false), open });

const itemCount = computed(() => list.value?.children.length ?? 0);

function toggle() {
  open.value = !open.value;
  haptics.tick();
}
</script>

<template>
  <div class="m3-fab-menu" :class="[`m3-fab-menu--${props.color}`, { 'm3-fab-menu--open': open }]">
    <div
      v-if="open"
      class="m3-fab-menu__catch"
      aria-hidden="true"
      @pointerdown.prevent="open = false"
    />
    <ul
      ref="list"
      class="m3-fab-menu__items"
      :aria-hidden="!open"
      :inert="!open"
      :style="{ '--m3-fab-count': itemCount }"
    >
      <slot />
    </ul>
    <button
      v-ripple
      type="button"
      class="m3-fab-menu__toggle m3-state m3-focus-ring"
      :aria-label="open ? props.closeLabel : props.label"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="m3-fab-menu__icon m3-fab-menu__icon--open" aria-hidden="true"
        ><slot name="icon"
      /></span>
      <M3Glyph name="close" class="m3-fab-menu__icon m3-fab-menu__icon--close" />
    </button>
  </div>
</template>

<style scoped>
.m3-fab-menu {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.m3-fab-menu__catch {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.m3-fab-menu__items {
  position: absolute;
  inset-inline-end: 0;
  bottom: calc(100% + 8px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}

.m3-fab-menu--open .m3-fab-menu__items {
  pointer-events: auto;
}

.m3-fab-menu__toggle {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-level3);
  cursor: pointer;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects),
    color var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects);
}

.m3-fab-menu--open .m3-fab-menu__toggle {
  border-radius: 28px;
}

.m3-fab-menu__icon {
  grid-area: 1 / 1;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 24px;
  transition:
    rotate var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-fab-menu__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-fab-menu__icon--close {
  width: 20px;
  height: 20px;
  fill: currentColor;
  opacity: 0;
  rotate: -90deg;
}

.m3-fab-menu--open .m3-fab-menu__icon--open {
  opacity: 0;
  rotate: 90deg;
}

.m3-fab-menu--open .m3-fab-menu__icon--close {
  opacity: 1;
  rotate: 0deg;
}

.m3-fab-menu--primary .m3-fab-menu__toggle {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-fab-menu--primary.m3-fab-menu--open .m3-fab-menu__toggle {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-fab-menu--secondary .m3-fab-menu__toggle {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-fab-menu--secondary.m3-fab-menu--open .m3-fab-menu__toggle {
  background: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}

.m3-fab-menu--tertiary .m3-fab-menu__toggle {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-fab-menu--tertiary.m3-fab-menu--open .m3-fab-menu__toggle {
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}
</style>
