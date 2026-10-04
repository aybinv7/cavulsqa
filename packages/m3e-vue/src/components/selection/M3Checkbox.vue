<script setup lang="ts">
import { useHaptics } from "../../composables/services.js";

/**
 * The M3 checkbox: an 18dp box in a 40dp state layer, the check drawn in rather than popped.
 * `indeterminate` shows a dash and reads as "mixed". `error` paints it in the error role.
 *
 * @see https://m3.material.io/components/checkbox/specs
 */
const props = withDefaults(
  defineProps<{ label?: string; indeterminate?: boolean; error?: boolean; disabled?: boolean }>(),
  { indeterminate: false, error: false, disabled: false },
);

const checked = defineModel<boolean>({ default: false });
const haptics = useHaptics();

function toggle() {
  if (props.disabled) return;
  checked.value = !checked.value;
  haptics.tick();
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    class="m3-checkbox m3-focus-ring"
    :class="{
      'm3-checkbox--on': checked || props.indeterminate,
      'm3-checkbox--error': props.error,
    }"
    :aria-checked="props.indeterminate ? 'mixed' : checked"
    :aria-label="props.label"
    :aria-invalid="props.error || undefined"
    :disabled="props.disabled"
    @click="toggle"
  >
    <span class="m3-checkbox__box" aria-hidden="true">
      <svg viewBox="0 0 18 18">
        <path v-if="props.indeterminate" class="m3-checkbox__mark" d="M4 9h10" />
        <path
          v-else
          class="m3-checkbox__mark m3-checkbox__mark--check"
          d="M3.5 9.2 7.2 12.8 14.5 5.5"
        />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.m3-checkbox {
  position: relative;
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.m3-checkbox::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

@media (hover: hover) {
  .m3-checkbox:hover::before {
    opacity: var(--md-sys-state-hover-opacity);
  }
}

.m3-checkbox:active::before {
  opacity: var(--md-sys-state-pressed-opacity);
}

.m3-checkbox__box {
  position: relative;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border: 2px solid var(--md-sys-color-on-surface-variant);
  border-radius: 2px;
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    border-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-checkbox--on .m3-checkbox__box {
  border-color: var(--md-sys-color-primary);
  background: var(--md-sys-color-primary);
}

.m3-checkbox--error .m3-checkbox__box {
  border-color: var(--md-sys-color-error);
}

.m3-checkbox--error.m3-checkbox--on .m3-checkbox__box {
  background: var(--md-sys-color-error);
}

svg {
  position: absolute;
  inset: -2px;
  width: 18px;
  height: 18px;
}

.m3-checkbox__mark {
  fill: none;
  stroke: var(--md-sys-color-on-primary);
  stroke-width: 2;
  stroke-linecap: square;
  stroke-dasharray: 16;
  stroke-dashoffset: 16;
  transition: stroke-dashoffset var(--md-sys-motion-duration-short4)
    var(--md-sys-motion-easing-emphasized-decelerate);
}

.m3-checkbox--error .m3-checkbox__mark {
  stroke: var(--md-sys-color-on-error);
}

.m3-checkbox--on .m3-checkbox__mark {
  stroke-dashoffset: 0;
}

.m3-checkbox:disabled {
  opacity: 0.38;
  cursor: default;
}
</style>
