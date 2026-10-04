<script setup lang="ts">
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";
import { useButtonGroup } from "./context.js";
import { buttonVariables, type ButtonSize } from "./sizes.js";

/**
 * The Expressive common button: five sizes, round or square, and a shape that tightens while
 * pressed (on the effects spring - a press never bounces). As a toggle, an unselected round button
 * becomes square when selected and a square one becomes round.
 *
 * @see https://m3.material.io/components/buttons/specs
 * @see https://m3.material.io/components/buttons/guidelines
 */
const props = withDefaults(
  defineProps<{
    variant?: "filled" | "tonal" | "outlined" | "elevated" | "text";
    size?: ButtonSize;
    shape?: "round" | "square";
    /** Makes it a toggle button; bind the state with `v-model:selected`. */
    toggle?: boolean;
    disabled?: boolean;
    href?: string;
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "filled", shape: "round", toggle: false, disabled: false, type: "button" },
);

const selected = defineModel<boolean>("selected", { default: false });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
const group = useButtonGroup();
const haptics = useHaptics();

const size = computed<ButtonSize>(() => props.size ?? group?.size.value ?? "s");
const style = computed(() => buttonVariables(size.value));
const isSelected = computed(() => props.toggle && selected.value);

function onClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  if (props.toggle) {
    selected.value = !selected.value;
    haptics.tick();
  }
  emit("click", event);
}
</script>

<template>
  <component
    :is="props.href ? 'a' : 'button'"
    v-ripple="!props.disabled"
    class="m3-button m3-state m3-focus-ring m3-target"
    :class="[
      `m3-button--${props.variant}`,
      `m3-button--${props.shape}`,
      {
        'm3-button--toggle': props.toggle,
        'm3-button--selected': isSelected,
        'm3-button--connected': group?.connected.value,
      },
    ]"
    :style="style"
    :href="props.href && !props.disabled ? props.href : undefined"
    :type="props.href ? undefined : props.type"
    :disabled="props.href ? undefined : props.disabled"
    :aria-disabled="props.disabled || undefined"
    :aria-pressed="props.toggle ? selected : undefined"
    @click="onClick"
  >
    <span v-if="$slots.icon" class="m3-button__icon" aria-hidden="true"
      ><slot name="icon" :selected="isSelected"
    /></span>
    <span class="m3-button__label"><slot /></span>
    <span v-if="$slots.trailing" class="m3-button__icon" aria-hidden="true"
      ><slot name="trailing"
    /></span>
  </component>
</template>

<style scoped>
.m3-button {
  --m3-btn-rest: var(--m3-btn-round);
  --m3-btn-start: var(--m3-btn-rest);
  --m3-btn-end: var(--m3-btn-rest);
  --m3-btn-expand: 0px;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: var(--m3-btn-gap);
  box-sizing: border-box;
  height: var(--m3-btn-height);
  min-width: 48px;
  margin: 0;
  padding-block: 0;
  padding-inline: calc(var(--m3-btn-padding) + var(--m3-btn-expand))
    calc(var(--m3-btn-padding-end, var(--m3-btn-padding)) + var(--m3-btn-expand));
  border: 0;
  border-start-start-radius: var(--m3-btn-start);
  border-end-start-radius: var(--m3-btn-start);
  border-start-end-radius: var(--m3-btn-end);
  border-end-end-radius: var(--m3-btn-end);
  font-family: var(--m3-btn-font);
  font-size: var(--m3-btn-font-size);
  line-height: var(--m3-btn-line-height);
  font-weight: var(--m3-btn-font-weight);
  letter-spacing: var(--m3-btn-tracking);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition:
    border-radius var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects),
    padding var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    color var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
    box-shadow var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-button--square {
  --m3-btn-rest: var(--m3-btn-square);
}

.m3-button--toggle.m3-button--selected.m3-button--round {
  --m3-btn-rest: var(--m3-btn-square);
}

.m3-button--toggle.m3-button--selected.m3-button--square {
  --m3-btn-rest: var(--m3-btn-round);
}

.m3-button[data-pressed] {
  --m3-btn-start: var(--m3-btn-pressed);
  --m3-btn-end: var(--m3-btn-pressed);
}

.m3-button__icon {
  display: inline-grid;
  place-items: center;
  width: var(--m3-btn-icon);
  height: var(--m3-btn-icon);
  font-size: var(--m3-btn-icon);
}

.m3-button__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-button--filled {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-button--filled.m3-button--toggle:not(.m3-button--selected) {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
}

.m3-button--tonal {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-button--tonal.m3-button--selected {
  background: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}

.m3-button--outlined {
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: inset 0 0 0 var(--m3-btn-outline) var(--md-sys-color-outline-variant);
}

.m3-button--outlined.m3-button--selected {
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: none;
}

.m3-button--elevated {
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-level1);
}

.m3-button--elevated.m3-button--selected {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-button--text {
  --m3-btn-padding: 12px;
  background: transparent;
  color: var(--md-sys-color-primary);
}

.m3-button:disabled,
.m3-button[aria-disabled="true"] {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  box-shadow: none;
  cursor: default;
  pointer-events: none;
}

.m3-button--text:disabled,
.m3-button--text[aria-disabled="true"] {
  background: transparent;
}
</style>
