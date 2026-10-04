<script setup lang="ts">
import { shallowRef, useTemplateRef } from "vue";
import { useScrollContainer, type ScrollTarget } from "../../composables/useScrollContainer.js";

/**
 * The floating toolbar that replaces the bottom app bar for page actions: a 64dp pill of icon
 * buttons, 16dp above the gesture area, with an optional FAB beside it in `#fab`. With
 * `hideOnScroll` it slides away while content scrolls down and returns on the way up.
 *
 * @see https://m3.material.io/components/toolbars/specs
 * @see https://m3.material.io/components/toolbars/guidelines
 */
const props = withDefaults(
  defineProps<{
    variant?: "standard" | "vibrant";
    orientation?: "horizontal" | "vertical";
    hideOnScroll?: boolean;
    scrollTarget?: ScrollTarget;
    label?: string;
    /** `fixed` floats over the page; `static` leaves placement to the parent. */
    position?: "fixed" | "static";
  }>(),
  { variant: "standard", orientation: "horizontal", hideOnScroll: false, position: "fixed" },
);

const root = useTemplateRef<HTMLElement>("root");
const hidden = shallowRef(false);
const SLOP = 8;

useScrollContainer(
  root,
  () => props.scrollTarget,
  (top, delta) => {
    if (!props.hideOnScroll) return;
    if (top <= 0) hidden.value = false;
    else if (delta > SLOP) hidden.value = true;
    else if (delta < -SLOP) hidden.value = false;
  },
);
</script>

<template>
  <div
    ref="root"
    class="m3-floating-toolbar"
    :class="[
      `m3-floating-toolbar--${props.position}`,
      `m3-floating-toolbar--${props.orientation}`,
      { 'm3-floating-toolbar--hidden': hidden, 'm3-floating-toolbar--with-fab': $slots.fab },
    ]"
  >
    <div
      class="m3-floating-toolbar__bar"
      :class="`m3-floating-toolbar__bar--${props.variant}`"
      role="toolbar"
      :aria-label="props.label"
      :aria-orientation="props.orientation"
    >
      <slot />
    </div>
    <div v-if="$slots.fab" class="m3-floating-toolbar__fab"><slot name="fab" /></div>
  </div>
</template>

<style scoped>
.m3-floating-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  transition:
    transform var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects);
}

.m3-floating-toolbar--fixed {
  position: fixed;
  inset-inline: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom) + var(--m3-floating-toolbar-offset, 0px));
  z-index: 4;
  justify-content: center;
}

.m3-floating-toolbar--vertical {
  flex-direction: column;
}

.m3-floating-toolbar--hidden {
  transform: translateY(calc(100% + 16px + env(safe-area-inset-bottom)));
  opacity: 0;
}

.m3-floating-toolbar__bar,
.m3-floating-toolbar__fab {
  pointer-events: auto;
}

.m3-floating-toolbar__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 64px;
  box-sizing: border-box;
  padding: 0 8px;
  border-radius: 32px;
  box-shadow: var(--m3-floating-toolbar-elevation, none);
  transition: box-shadow var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-floating-toolbar--with-fab .m3-floating-toolbar__bar {
  --m3-floating-toolbar-elevation: var(--md-sys-elevation-level1);
}

.m3-floating-toolbar--vertical .m3-floating-toolbar__bar {
  flex-direction: column;
  min-height: 0;
  min-width: 64px;
  padding: 8px 0;
}

.m3-floating-toolbar__bar--standard {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
}

.m3-floating-toolbar__bar--vibrant {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-floating-toolbar__bar--vibrant :deep(.m3-icon-button--standard) {
  color: var(--md-sys-color-on-primary-container);
}
</style>
