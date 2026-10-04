<script setup lang="ts">
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";

/**
 * The M3 card: `elevated` (surface-container-low with a level 1 shadow), `filled`
 * (surface-container-highest) or `outlined`, 12dp corners. With `clickable` or `href` the whole
 * card is one target with a state layer; nest no other buttons inside a clickable card.
 *
 * @see https://m3.material.io/components/cards/specs
 */
const props = withDefaults(
  defineProps<{
    variant?: "elevated" | "filled" | "outlined";
    clickable?: boolean;
    href?: string;
    disabled?: boolean;
  }>(),
  { variant: "filled", clickable: false, disabled: false },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
const interactive = computed(() => props.clickable || Boolean(props.href));
const tag = computed(() => (props.href ? "a" : interactive.value ? "button" : "div"));
</script>

<template>
  <component
    :is="tag"
    v-ripple="interactive && !props.disabled"
    class="m3-card"
    :class="[
      `m3-card--${props.variant}`,
      { 'm3-card--interactive m3-state m3-focus-ring': interactive },
    ]"
    :href="props.href && !props.disabled ? props.href : undefined"
    :type="tag === 'button' ? 'button' : undefined"
    :disabled="tag === 'button' ? props.disabled : undefined"
    @click="interactive && !props.disabled && emit('click', $event)"
  >
    <slot />
  </component>
</template>

<style scoped>
.m3-card {
  display: block;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  color: var(--md-sys-color-on-surface);
  font: inherit;
  text-align: start;
  text-decoration: none;
  transition:
    box-shadow var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-card--interactive {
  width: 100%;
  cursor: pointer;
  user-select: none;
}

.m3-card--interactive[data-pressed] {
  transform: scale(0.985);
}

.m3-card--elevated {
  background: var(--md-sys-color-surface-container-low);
  box-shadow: var(--md-sys-elevation-level1);
}

@media (hover: hover) {
  .m3-card--elevated.m3-card--interactive:hover {
    box-shadow: var(--md-sys-elevation-level2);
  }
}

.m3-card--filled {
  background: var(--md-sys-color-surface-container-highest);
}

.m3-card--outlined {
  background: var(--md-sys-color-surface);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
}

.m3-card:disabled {
  opacity: 0.38;
  pointer-events: none;
}
</style>
