<script setup lang="ts">
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useNavigation } from "./context.js";

/**
 * One destination of a navigation bar or rail. The `icon` slot receives `selected`, so a filled
 * glyph can replace the outlined one - M3 marks selection with the icon's fill as well as the
 * indicator. `badge` takes a count or `true` for a dot.
 */
const props = defineProps<{
  value: string;
  label: string;
  badge?: number | boolean;
  href?: string;
}>();

const nav = useNavigation("M3NavigationItem");
const selected = computed(() => nav.selected.value === props.value);
const badgeText = computed(() => {
  if (typeof props.badge !== "number") return "";
  return props.badge > 999 ? "999+" : String(props.badge);
});

function onClick() {
  nav.select(props.value);
}
</script>

<template>
  <component
    :is="props.href ? 'a' : 'button'"
    class="m3-nav-item m3-focus-ring"
    :class="[`m3-nav-item--${nav.layout.value}`, { 'm3-nav-item--selected': selected }]"
    :href="props.href"
    :type="props.href ? undefined : 'button'"
    :aria-current="selected ? 'page' : undefined"
    @click="onClick"
  >
    <span v-ripple class="m3-nav-item__indicator m3-state">
      <span class="m3-nav-item__icon" aria-hidden="true">
        <slot name="icon" :selected="selected" />
        <span
          v-if="props.badge"
          class="m3-nav-item__badge"
          :class="{ 'm3-nav-item__badge--dot': typeof props.badge !== 'number' }"
        >
          {{ badgeText }}
        </span>
      </span>
      <span v-if="nav.layout.value === 'horizontal'" class="m3-nav-item__label">{{
        props.label
      }}</span>
    </span>
    <span v-if="nav.layout.value === 'vertical'" class="m3-nav-item__label">{{ props.label }}</span>
  </component>
</template>

<style scoped>
.m3-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 48px;
  min-height: 48px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--md-sys-color-on-surface-variant);
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline-offset: -2px;
  border-radius: 16px;
}

.m3-nav-item__indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 56px;
  height: 32px;
  border-radius: 16px;
}

.m3-nav-item__indicator::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  border-radius: inherit;
  background: var(--md-sys-color-secondary-container);
  opacity: 0;
  transform: scaleX(0.4);
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-nav-item--selected .m3-nav-item__indicator::after {
  opacity: 1;
  transform: none;
}

.m3-nav-item__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 24px;
}

.m3-nav-item__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-nav-item--selected .m3-nav-item__icon {
  color: var(--md-sys-color-on-secondary-container);
}

.m3-nav-item__label {
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking);
  white-space: nowrap;
}

.m3-nav-item--selected .m3-nav-item__label {
  color: var(--md-sys-color-secondary);
}

.m3-nav-item--horizontal .m3-nav-item__indicator {
  width: auto;
  height: 40px;
  padding: 0 16px;
  gap: 4px;
  border-radius: 20px;
}

.m3-nav-item--horizontal.m3-nav-item--selected .m3-nav-item__label {
  color: var(--md-sys-color-on-secondary-container);
}

.m3-nav-item__badge {
  position: absolute;
  inset-inline-start: calc(100% - 8px);
  top: -4px;
  display: grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) / 16px
    var(--md-sys-typescale-label-small-font);
}

.m3-nav-item__badge--dot {
  inset-inline-start: calc(100% - 4px);
  top: 0;
  min-width: 6px;
  height: 6px;
  padding: 0;
}
</style>
