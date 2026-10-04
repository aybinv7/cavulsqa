<script setup lang="ts">
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";
import { useButtonGroup } from "./context.js";
import { buttonVariables, type ButtonSize } from "./sizes.js";

/**
 * The Expressive icon button: five sizes, three widths, round or square, with the same press and
 * toggle shape morph as the common button. `label` is required - an icon alone is not an accessible
 * name.
 *
 * @see https://m3.material.io/components/icon-buttons/specs
 */
const props = withDefaults(
  defineProps<{
    label: string;
    variant?: "standard" | "filled" | "tonal" | "outlined";
    size?: ButtonSize;
    width?: "narrow" | "default" | "wide";
    shape?: "round" | "square";
    toggle?: boolean;
    disabled?: boolean;
    href?: string;
  }>(),
  { variant: "standard", width: "default", shape: "round", toggle: false, disabled: false },
);

const selected = defineModel<boolean>("selected", { default: false });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
const group = useButtonGroup();
const haptics = useHaptics();

const size = computed<ButtonSize>(() => props.size ?? group?.size.value ?? "s");
const style = computed(() => buttonVariables(size.value, props.width));
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
    class="m3-icon-button m3-state m3-focus-ring m3-target"
    :class="[
      `m3-icon-button--${props.variant}`,
      `m3-icon-button--${props.shape}`,
      { 'm3-icon-button--toggle': props.toggle, 'm3-icon-button--selected': isSelected },
    ]"
    :style="style"
    :href="props.href && !props.disabled ? props.href : undefined"
    :type="props.href ? undefined : 'button'"
    :disabled="props.href ? undefined : props.disabled"
    :aria-disabled="props.disabled || undefined"
    :aria-label="props.label"
    :title="props.label"
    :aria-pressed="props.toggle ? selected : undefined"
    @click="onClick"
  >
    <span class="m3-icon-button__icon" aria-hidden="true"><slot :selected="isSelected" /></span>
  </component>
</template>

<style scoped>
.m3-icon-button {
  --m3-btn-rest: var(--m3-btn-round);
  --m3-btn-start: var(--m3-btn-rest);
  --m3-btn-end: var(--m3-btn-rest);
  --m3-btn-expand: 0px;
  display: inline-grid;
  flex: none;
  place-items: center;
  box-sizing: border-box;
  width: calc(var(--m3-btn-width) + 2 * var(--m3-btn-expand));
  height: var(--m3-btn-height);
  margin: 0;
  padding: 0;
  border: 0;
  border-start-start-radius: var(--m3-btn-start);
  border-end-start-radius: var(--m3-btn-start);
  border-start-end-radius: var(--m3-btn-end);
  border-end-end-radius: var(--m3-btn-end);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition:
    border-radius var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects),
    width var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    color var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}

.m3-icon-button--square,
.m3-icon-button--toggle.m3-icon-button--selected.m3-icon-button--round {
  --m3-btn-rest: var(--m3-btn-square);
}

.m3-icon-button--toggle.m3-icon-button--selected.m3-icon-button--square {
  --m3-btn-rest: var(--m3-btn-round);
}

.m3-icon-button[data-pressed] {
  --m3-btn-start: var(--m3-btn-pressed);
  --m3-btn-end: var(--m3-btn-pressed);
}

.m3-icon-button__icon {
  display: grid;
  place-items: center;
  width: var(--m3-btn-icon);
  height: var(--m3-btn-icon);
  font-size: var(--m3-btn-icon);
}

.m3-icon-button__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-icon-button--standard.m3-icon-button--selected {
  color: var(--md-sys-color-primary);
}

.m3-icon-button--filled {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-icon-button--filled.m3-icon-button--toggle:not(.m3-icon-button--selected) {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-primary);
}

.m3-icon-button--tonal {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-icon-button--tonal.m3-icon-button--selected {
  background: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}

.m3-icon-button--outlined {
  box-shadow: inset 0 0 0 var(--m3-btn-outline) var(--md-sys-color-outline-variant);
}

.m3-icon-button--outlined.m3-icon-button--selected {
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: none;
}

.m3-icon-button:disabled,
.m3-icon-button[aria-disabled="true"] {
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  cursor: default;
  pointer-events: none;
}

.m3-icon-button--filled:disabled,
.m3-icon-button--tonal:disabled,
.m3-icon-button--filled[aria-disabled="true"],
.m3-icon-button--tonal[aria-disabled="true"] {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
}
</style>
