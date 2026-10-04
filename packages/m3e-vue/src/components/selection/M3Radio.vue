<script setup lang="ts" generic="T">
import { computed } from "vue";
import { useHaptics } from "../../composables/services.js";

/**
 * The M3 radio button: a 20dp ring whose dot grows in on the fast spatial spring. Bind every radio
 * of a group to the same `v-model`; each carries its own `value`.
 *
 * @see https://m3.material.io/components/radio-button/specs
 */
const props = withDefaults(defineProps<{ value: T; label?: string; disabled?: boolean }>(), {
  disabled: false,
});

const model = defineModel<T>();
const haptics = useHaptics();
const checked = computed(() => model.value === props.value);

function select() {
  if (props.disabled || checked.value) return;
  model.value = props.value;
  haptics.tick();
}
</script>

<template>
  <button
    type="button"
    role="radio"
    class="m3-radio m3-focus-ring"
    :class="{ 'm3-radio--on': checked }"
    :aria-checked="checked"
    :aria-label="props.label"
    :disabled="props.disabled"
    @click="select"
  >
    <span class="m3-radio__ring" aria-hidden="true"><span class="m3-radio__dot" /></span>
  </button>
</template>

<style scoped>
.m3-radio {
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

.m3-radio::before {
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
  .m3-radio:hover::before {
    opacity: var(--md-sys-state-hover-opacity);
  }
}

.m3-radio:active::before {
  opacity: var(--md-sys-state-pressed-opacity);
}

.m3-radio__ring {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  border: 2px solid var(--md-sys-color-on-surface-variant);
  border-radius: 50%;
  transition: border-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-radio--on .m3-radio__ring {
  border-color: var(--md-sys-color-primary);
}

.m3-radio__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
  transform: scale(0);
  transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-radio--on .m3-radio__dot {
  transform: scale(1);
}

.m3-radio:disabled {
  opacity: 0.38;
  cursor: default;
}
</style>
