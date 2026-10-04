<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { useHaptics } from "../../composables/services.js";

/**
 * The M3 switch: a 52x32 track whose handle grows from 16 to 24dp when on (28 while pressed) and
 * travels on the fast spatial spring - the slight overshoot is intended. `icons` shows a check
 * on the selected handle, and a cross on the unselected one when `bothIcons` is set.
 *
 * @see https://m3.material.io/components/switch/specs
 */
const props = withDefaults(
  defineProps<{ label?: string; icons?: boolean; bothIcons?: boolean; disabled?: boolean }>(),
  { icons: false, bothIcons: false, disabled: false },
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
    role="switch"
    class="m3-switch m3-focus-ring"
    :class="{
      'm3-switch--on': checked,
      'm3-switch--icon': (props.icons && checked) || props.bothIcons,
    }"
    :aria-checked="checked"
    :aria-label="props.label"
    :disabled="props.disabled"
    @click="toggle"
  >
    <span class="m3-switch__handle-area">
      <span class="m3-switch__state" aria-hidden="true" />
      <span class="m3-switch__handle" aria-hidden="true">
        <M3Glyph name="check" v-if="props.icons && checked" />
        <M3Glyph name="close" v-else-if="props.bothIcons" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.m3-switch {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  box-sizing: border-box;
  width: 52px;
  height: 32px;
  margin: 8px 0;
  padding: 0;
  border: 2px solid var(--md-sys-color-outline);
  border-radius: 16px;
  background: var(--md-sys-color-surface-container-highest);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    border-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-switch::after {
  content: "";
  position: absolute;
  inset: -8px -2px;
}

.m3-switch--on {
  border-color: var(--md-sys-color-primary);
  background: var(--md-sys-color-primary);
}

.m3-switch__handle-area {
  position: absolute;
  top: 50%;
  left: 14px;
  display: grid;
  place-items: center;
  width: 0;
  height: 0;
  translate: 0 0;
  transition: translate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-switch--on .m3-switch__handle-area {
  translate: 20px 0;
}

:global([dir="rtl"] .m3-switch__handle-area) {
  left: auto;
  right: 14px;
}

:global([dir="rtl"] .m3-switch--on .m3-switch__handle-area) {
  translate: -20px 0;
}

.m3-switch__state {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-switch--on .m3-switch__state {
  background: var(--md-sys-color-primary);
}

@media (hover: hover) {
  .m3-switch:hover .m3-switch__state {
    opacity: var(--md-sys-state-hover-opacity);
  }
}

.m3-switch:active .m3-switch__state {
  opacity: var(--md-sys-state-pressed-opacity);
}

.m3-switch__handle {
  position: absolute;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--md-sys-color-outline);
  color: var(--md-sys-color-surface-container-highest);
  transition:
    width var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    height var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-switch--icon .m3-switch__handle,
.m3-switch--on .m3-switch__handle {
  width: 24px;
  height: 24px;
}

.m3-switch--on .m3-switch__handle {
  background: var(--md-sys-color-on-primary);
  color: var(--md-sys-color-on-primary-container);
}

.m3-switch:active .m3-switch__handle {
  width: 28px;
  height: 28px;
}

.m3-switch__handle svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.m3-switch:disabled {
  opacity: 0.38;
  cursor: default;
}
</style>
