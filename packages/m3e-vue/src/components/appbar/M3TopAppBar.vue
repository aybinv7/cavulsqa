<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { useScrollContainer, type ScrollTarget } from "../../composables/useScrollContainer.js";

/**
 * The top app bar: `small` (64dp), or the flexible `medium` and `large` whose big title scrolls
 * away under a pinned 64dp bar that then shows the title itself. The bar takes the
 * `surface-container` colour once content scrolls beneath it. Place it first in the scrolling
 * container (a Framework7 `.page-content`); it pads itself for the status bar.
 *
 * Tapping the bar anywhere but its buttons scrolls the content back to the top - the Android
 * stand-in for iOS's status-bar tap, which Android keeps for its own shade. `scrollToTop` turns it
 * off.
 *
 * @see https://m3.material.io/components/app-bars/specs
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    variant?: "small" | "medium" | "large";
    centered?: boolean;
    scrollTarget?: ScrollTarget;
    scrollToTop?: boolean;
  }>(),
  { variant: "small", centered: false, scrollToTop: true },
);

const bar = useTemplateRef<HTMLElement>("bar");
const expanded = useTemplateRef<HTMLElement>("expanded");
const flexible = computed(() => props.variant !== "small");

const reduced = useReducedMotion();
const INTERACTIVE = "button, a, input, select, textarea, [role=button], [role=menuitem]";

const container = useScrollContainer(
  bar,
  () => props.scrollTarget,
  (scrollTop) => {
    const element = bar.value;
    if (!element) return;
    element.toggleAttribute("data-scrolled", scrollTop > 0);
    if (!flexible.value) return;
    const range = expanded.value?.offsetHeight ?? 1;
    const collapse = Math.min(1, scrollTop / Math.max(1, range));
    element.style.setProperty("--m3-app-bar-collapse", collapse.toFixed(3));
    expanded.value?.style.setProperty("--m3-app-bar-collapse", collapse.toFixed(3));
  },
);

function onTap(event: MouseEvent) {
  const scroller = container.value;
  if (!props.scrollToTop || !scroller || scroller.scrollTop <= 0) return;
  if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
  scroller.scrollTo({ top: 0, behavior: reduced.value ? "auto" : "smooth" });
}
</script>

<template>
  <header
    ref="bar"
    v-bind="$attrs"
    class="m3-app-bar"
    :class="[`m3-app-bar--${props.variant}`, { 'm3-app-bar--centered': props.centered }]"
    @click="onTap"
  >
    <div class="m3-app-bar__row">
      <div v-if="$slots.navigation" class="m3-app-bar__navigation"><slot name="navigation" /></div>
      <div class="m3-app-bar__title" :aria-hidden="flexible || undefined">
        <span
          class="m3-app-bar__headline"
          :role="flexible ? undefined : 'heading'"
          :aria-level="flexible ? undefined : 1"
        >
          {{ props.title }}
        </span>
        <span v-if="props.subtitle && !flexible" class="m3-app-bar__subtitle">{{
          props.subtitle
        }}</span>
      </div>
      <div class="m3-app-bar__actions"><slot name="actions" /></div>
    </div>
  </header>
  <div
    v-if="flexible"
    ref="expanded"
    class="m3-app-bar-expanded"
    :class="`m3-app-bar-expanded--${props.variant}`"
  >
    <h1 class="m3-app-bar-expanded__title">{{ props.title }}</h1>
    <p v-if="props.subtitle" class="m3-app-bar-expanded__subtitle">{{ props.subtitle }}</p>
  </div>
</template>

<style scoped>
.m3-app-bar {
  --m3-app-bar-collapse: 0;
  position: sticky;
  top: 0;
  z-index: 3;
  padding-top: env(safe-area-inset-top);
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  transition: background-color var(--md-sys-motion-spring-default-effects-duration)
    var(--md-sys-motion-spring-default-effects);
}

.m3-app-bar[data-scrolled] {
  background: var(--md-sys-color-surface-container);
}

.m3-app-bar__row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 64px;
  padding: 0 4px;
}

.m3-app-bar__navigation,
.m3-app-bar__actions {
  display: flex;
  flex: none;
  align-items: center;
  min-width: 48px;
}

.m3-app-bar__actions {
  justify-content: flex-end;
}

.m3-app-bar__title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 0 4px;
}

.m3-app-bar__title:first-child {
  padding-inline-start: 12px;
}

.m3-app-bar--centered .m3-app-bar__title {
  align-items: center;
  text-align: center;
}

.m3-app-bar__headline {
  overflow: hidden;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-app-bar__subtitle {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-app-bar--medium .m3-app-bar__title,
.m3-app-bar--large .m3-app-bar__title {
  opacity: clamp(0, calc((var(--m3-app-bar-collapse) - 0.6) * 2.5), 1);
}

.m3-app-bar-expanded {
  --m3-app-bar-collapse: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 16px 12px;
  color: var(--md-sys-color-on-surface);
  opacity: calc(1 - var(--m3-app-bar-collapse) * 1.2);
}

.m3-app-bar-expanded--medium {
  min-height: 48px;
}

.m3-app-bar-expanded--large {
  min-height: 56px;
}

.m3-app-bar-expanded__title {
  margin: 0;
  font: var(--md-sys-typescale-headline-medium-weight)
    var(--md-sys-typescale-headline-medium-size) /
    var(--md-sys-typescale-headline-medium-line-height) var(--md-sys-typescale-headline-medium-font);
}

.m3-app-bar-expanded--large .m3-app-bar-expanded__title {
  font: var(--md-sys-typescale-display-small-weight) var(--md-sys-typescale-display-small-size) /
    var(--md-sys-typescale-display-small-line-height) var(--md-sys-typescale-display-small-font);
}

.m3-app-bar-expanded__subtitle {
  margin: 4px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
}

.m3-app-bar-expanded--large .m3-app-bar-expanded__subtitle {
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
}
</style>
