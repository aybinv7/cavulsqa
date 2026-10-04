<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { vRipple } from "../../directives/ripple.js";
import { useMenu } from "./context.js";

/**
 * One menu item: 44dp, a leading icon in `#icon`, optional supporting text and a trailing text
 * such as a shortcut. `selected` gives it the tertiary container and rounder corners; `checkable`
 * makes it a `menuitemcheckbox`. Choosing it closes the menu unless `keepOpen` is set.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    supporting?: string;
    trailingText?: string;
    selected?: boolean;
    checkable?: boolean;
    disabled?: boolean;
    keepOpen?: boolean;
    tone?: "default" | "destructive";
  }>(),
  { selected: false, checkable: false, disabled: false, keepOpen: false, tone: "default" },
);

const emit = defineEmits<{ select: [] }>();
const menu = useMenu();

function choose() {
  if (props.disabled) return;
  emit("select");
  if (!props.keepOpen) menu.close();
}
</script>

<template>
  <button
    v-ripple="!props.disabled"
    type="button"
    class="m3-menu-item m3-state"
    :class="[`m3-menu-item--${props.tone}`, { 'm3-menu-item--selected': props.selected }]"
    :role="props.checkable ? 'menuitemcheckbox' : 'menuitem'"
    :aria-checked="props.checkable ? props.selected : undefined"
    :disabled="props.disabled"
    tabindex="-1"
    @click="choose"
  >
    <span v-if="$slots.icon" class="m3-menu-item__icon" aria-hidden="true"
      ><slot name="icon"
    /></span>
    <span class="m3-menu-item__text">
      <span class="m3-menu-item__label">{{ props.label }}</span>
      <span v-if="props.supporting" class="m3-menu-item__supporting">{{ props.supporting }}</span>
    </span>
    <span v-if="props.trailingText" class="m3-menu-item__trailing">{{ props.trailingText }}</span>
    <M3Glyph name="check" v-if="props.selected && props.checkable" class="m3-menu-item__check" />
  </button>
</template>

<style scoped>
.m3-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 8px 12px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  letter-spacing: var(--md-sys-typescale-body-large-tracking);
  text-align: start;
  cursor: pointer;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-menu-item:first-of-type {
  border-start-start-radius: 12px;
  border-start-end-radius: 12px;
}

.m3-menu-item:last-of-type {
  border-end-start-radius: 12px;
  border-end-end-radius: 12px;
}

.m3-menu-item:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
}

.m3-menu-item--selected {
  border-radius: 12px;
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

:global(.m3-menu--vibrant .m3-menu-item--selected) {
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}

.m3-menu-item--destructive {
  color: var(--md-sys-color-error);
}

.m3-menu-item__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  font-size: 20px;
  color: var(--md-sys-color-on-surface-variant);
}

.m3-menu-item--selected .m3-menu-item__icon,
.m3-menu-item--destructive .m3-menu-item__icon {
  color: inherit;
}

.m3-menu-item__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-menu-item__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.m3-menu-item__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-menu-item__supporting,
.m3-menu-item__trailing {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-menu-item__check {
  flex: none;
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.m3-menu-item:disabled {
  opacity: 0.38;
  cursor: default;
}
</style>
