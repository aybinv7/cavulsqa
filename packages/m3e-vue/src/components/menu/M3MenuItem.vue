<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import M3Menu from "./M3Menu.vue";
import { shallowRef, useSlots, useTemplateRef } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useMenu } from "./context.js";

/**
 * One menu item: 44dp, a leading icon in `#icon`, optional supporting text and a trailing text
 * such as a shortcut. `selected` gives it the tertiary container and rounder corners; `checkable`
 * makes it a `menuitemcheckbox`. Choosing it closes the menu, and every menu it cascades from,
 * unless `keepOpen` is set.
 *
 * Items in `#submenu` make it a cascading item: a trailing arrow, and a menu beside it that opens on
 * tap, mouse hover or the arrow key toward it.
 */
defineOptions({ inheritAttrs: false });

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
    submenuLabel?: string;
  }>(),
  { selected: false, checkable: false, disabled: false, keepOpen: false, tone: "default" },
);

const emit = defineEmits<{ select: [] }>();
const slots = useSlots();
const menu = useMenu();
const button = useTemplateRef<HTMLButtonElement>("button");
const subOpen = shallowRef(false);

const hasSubmenu = () => Boolean(slots.submenu);

function choose() {
  if (props.disabled) return;
  if (hasSubmenu()) {
    subOpen.value = !subOpen.value;
    return;
  }
  emit("select");
  if (!props.keepOpen) menu.closeAll();
}

function onPointerEnter(event: PointerEvent) {
  if (event.pointerType === "mouse" && hasSubmenu() && !props.disabled) subOpen.value = true;
}

function onKeydown(event: KeyboardEvent) {
  if (!hasSubmenu() || props.disabled) return;
  const rtl = getComputedStyle(event.currentTarget as Element).direction === "rtl";
  if (event.key !== (rtl ? "ArrowLeft" : "ArrowRight")) return;
  event.preventDefault();
  event.stopPropagation();
  subOpen.value = true;
}
</script>

<template>
  <button
    ref="button"
    v-ripple="!props.disabled"
    v-bind="$attrs"
    type="button"
    class="m3-menu-item m3-state"
    :class="[
      `m3-menu-item--${props.tone}`,
      { 'm3-menu-item--selected': props.selected, 'm3-menu-item--expanded': subOpen },
    ]"
    :role="props.checkable ? 'menuitemcheckbox' : 'menuitem'"
    :aria-checked="props.checkable ? props.selected : undefined"
    :aria-haspopup="$slots.submenu ? 'menu' : undefined"
    :aria-expanded="$slots.submenu ? subOpen : undefined"
    :disabled="props.disabled"
    tabindex="-1"
    @click="choose"
    @pointerenter="onPointerEnter"
    @keydown="onKeydown"
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
    <M3Glyph v-if="$slots.submenu" name="chevronRight" class="m3-menu-item__cascade" />
  </button>
  <M3Menu
    v-if="$slots.submenu"
    v-model:open="subOpen"
    :anchor="button"
    placement="end"
    :variant="menu.variant()"
    :label="props.submenuLabel ?? props.label"
  >
    <slot name="submenu" />
  </M3Menu>
</template>

<style scoped>
.m3-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 8px 12px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
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

.m3-menu-item--expanded {
  background-color: color-mix(in srgb, currentColor 10%, transparent);
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

.m3-menu-item__cascade {
  flex: none;
  width: 20px;
  height: 20px;
  margin-inline-end: -4px;
  fill: var(--md-sys-color-on-surface-variant);
}

:global([dir="rtl"] .m3-menu-item__cascade) {
  transform: scaleX(-1);
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
