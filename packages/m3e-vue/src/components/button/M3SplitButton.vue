<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed } from "vue";
import M3Button from "./M3Button.vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";
import { BUTTON_METRICS, buttonVariables, type ButtonSize } from "./sizes.js";

/**
 * A primary action with a menu of related ones. The two halves sit 2dp apart with small inner
 * corners; while the menu is open the trailing half rounds off and its chevron turns over. Put the
 * menu in the `menu` slot, anchored to the slot's `anchor` element.
 *
 * @see https://m3.material.io/components/split-button/specs
 */
const props = withDefaults(
  defineProps<{
    variant?: "filled" | "tonal" | "outlined" | "elevated";
    size?: ButtonSize;
    menuLabel: string;
    disabled?: boolean;
  }>(),
  { variant: "filled", size: "s", disabled: false },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
const haptics = useHaptics();

const INNER: Record<ButtonSize, [rest: number, pressed: number, icon: number, leadingEnd: number]> =
  {
    xs: [4, 8, 22, 10],
    s: [4, 12, 22, 12],
    m: [4, 12, 26, 24],
    l: [8, 20, 38, 48],
    xl: [12, 20, 50, 64],
  };

const style = computed(() => {
  const [inner, pressed, icon, leadingEnd] = INNER[props.size];
  const height = BUTTON_METRICS[props.size].height;
  return {
    "--m3-split-inner": `${inner}px`,
    "--m3-split-inner-pressed": `${pressed}px`,
    "--m3-split-icon": `${icon}px`,
    "--m3-split-trailing": `${Math.max(48, height)}px`,
    "--m3-split-leading-end": `${leadingEnd}px`,
  };
});

const trailing = computed(() => buttonVariables(props.size));

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  haptics.tick();
}
</script>

<template>
  <div class="m3-split-button" :style="style">
    <M3Button
      class="m3-split-button__leading"
      :variant="props.variant"
      :size="props.size"
      :disabled="props.disabled"
      @click="emit('click', $event)"
    >
      <template v-if="$slots.icon" #icon><slot name="icon" /></template>
      <slot />
    </M3Button>
    <button
      v-ripple="!props.disabled"
      type="button"
      class="m3-split-button__trailing m3-state m3-focus-ring m3-target"
      :class="[
        `m3-split-button__trailing--${props.variant}`,
        { 'm3-split-button__trailing--open': open },
      ]"
      :style="trailing"
      :disabled="props.disabled"
      :aria-label="props.menuLabel"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <M3Glyph name="expandMore" />
    </button>
    <slot name="menu" />
  </div>
</template>

<style scoped>
.m3-split-button {
  position: relative;
  display: inline-flex;
  gap: 2px;
}

.m3-split-button__leading {
  --m3-btn-end: var(--m3-split-inner);
  --m3-btn-padding-end: var(--m3-split-leading-end);
}

.m3-split-button__leading[data-pressed] {
  --m3-btn-end: var(--m3-split-inner-pressed);
}

.m3-split-button__trailing {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--m3-split-trailing);
  height: var(--m3-btn-height);
  padding: 0;
  border: 0;
  border-start-start-radius: var(--m3-split-inner);
  border-end-start-radius: var(--m3-split-inner);
  border-start-end-radius: var(--m3-btn-round);
  border-end-end-radius: var(--m3-btn-round);
  cursor: pointer;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-split-button__trailing[data-pressed] {
  border-start-start-radius: var(--m3-split-inner-pressed);
  border-end-start-radius: var(--m3-split-inner-pressed);
}

.m3-split-button__trailing--open {
  border-radius: var(--m3-btn-round);
}

.m3-split-button__trailing svg {
  width: var(--m3-split-icon);
  height: var(--m3-split-icon);
  fill: currentColor;
  transition: rotate var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-split-button__trailing--open svg {
  rotate: 180deg;
}

.m3-split-button__trailing--filled {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-split-button__trailing--tonal {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-split-button__trailing--outlined {
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: inset 0 0 0 var(--m3-btn-outline) var(--md-sys-color-outline-variant);
}

.m3-split-button__trailing--elevated {
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-level1);
}

.m3-split-button__trailing:disabled {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  box-shadow: none;
  pointer-events: none;
}
</style>
