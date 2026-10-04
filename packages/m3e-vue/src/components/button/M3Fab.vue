<script setup lang="ts">
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";
import type { FabColor, FabSize } from "./fab.js";

/**
 * The floating action button. `label` is always the accessible name; setting `extended` makes it
 * an extended FAB that shows the label, and toggling it collapses the label away (on scroll,
 * typically) at the extended FAB's height.
 *
 * @see https://m3.material.io/components/floating-action-button/specs
 * @see https://m3.material.io/components/extended-fab/specs
 */
const props = withDefaults(
  defineProps<{
    label: string;
    /** Leave undefined for a plain FAB; true or false for an extended FAB, shown or collapsed. */
    extended?: boolean;
    size?: FabSize;
    color?: FabColor;
    lowered?: boolean;
    disabled?: boolean;
    href?: string;
  }>(),
  {
    extended: undefined,
    size: "default",
    color: "primary-container",
    lowered: false,
    disabled: false,
  },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();

const FAB: Record<FabSize, [size: number, icon: number, radius: number]> = {
  small: [40, 24, 12],
  default: [56, 24, 16],
  medium: [80, 28, 20],
  large: [96, 32, 28],
};

const EXTENDED: Record<
  FabSize,
  [height: number, icon: number, gap: number, padding: number, radius: number]
> = {
  small: [56, 24, 8, 16, 16],
  default: [56, 24, 8, 16, 16],
  medium: [80, 28, 16, 26, 20],
  large: [96, 32, 20, 28, 28],
};

const hasLabel = computed(() => props.extended !== undefined);
const showLabel = computed(() => props.extended === true);

const style = computed(() => {
  if (hasLabel.value) {
    const [height, icon, gap, padding, radius] = EXTENDED[props.size];
    return {
      "--m3-fab-height": `${height}px`,
      "--m3-fab-icon": `${icon}px`,
      "--m3-fab-gap": showLabel.value ? `${gap}px` : "0px",
      "--m3-fab-padding": showLabel.value ? `${padding}px` : `${(height - icon) / 2}px`,
      "--m3-fab-radius": `${radius}px`,
    };
  }
  const [size, icon, radius] = FAB[props.size];
  return {
    "--m3-fab-height": `${size}px`,
    "--m3-fab-icon": `${icon}px`,
    "--m3-fab-gap": "0px",
    "--m3-fab-padding": `${(size - icon) / 2}px`,
    "--m3-fab-radius": `${radius}px`,
  };
});
</script>

<template>
  <component
    :is="props.href ? 'a' : 'button'"
    v-ripple="!props.disabled"
    class="m3-fab m3-state m3-focus-ring m3-target"
    :class="[`m3-fab--${props.color}`, { 'm3-fab--lowered': props.lowered }]"
    :style="style"
    :href="props.href && !props.disabled ? props.href : undefined"
    :type="props.href ? undefined : 'button'"
    :disabled="props.href ? undefined : props.disabled"
    :aria-label="props.label"
    :title="showLabel ? undefined : props.label"
    @click="emit('click', $event)"
  >
    <span class="m3-fab__icon" aria-hidden="true"><slot /></span>
    <span
      v-if="hasLabel"
      class="m3-fab__label"
      :class="{ 'm3-fab__label--hidden': !showLabel }"
      aria-hidden="true"
    >
      <span>{{ props.label }}</span>
    </span>
  </component>
</template>

<style scoped>
.m3-fab {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--m3-fab-gap);
  box-sizing: border-box;
  height: var(--m3-fab-height);
  min-width: var(--m3-fab-height);
  margin: 0;
  padding: 0 var(--m3-fab-padding);
  border: 0;
  border-radius: var(--m3-fab-radius);
  box-shadow: var(--md-sys-elevation-level3);
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
  letter-spacing: var(--md-sys-typescale-title-medium-tracking);
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition:
    padding var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    gap var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    box-shadow var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-fab--lowered {
  box-shadow: var(--md-sys-elevation-level1);
}

.m3-fab[data-pressed] {
  box-shadow: var(--md-sys-elevation-level3);
}

@media (hover: hover) {
  .m3-fab:hover {
    box-shadow: var(--md-sys-elevation-level4);
  }
}

.m3-fab__icon {
  display: grid;
  place-items: center;
  width: var(--m3-fab-icon);
  height: var(--m3-fab-icon);
  font-size: var(--m3-fab-icon);
}

.m3-fab__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-fab__label {
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  white-space: nowrap;
  transition:
    grid-template-columns var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-fab__label > span {
  min-width: 0;
}

.m3-fab__label--hidden {
  grid-template-columns: 0fr;
  opacity: 0;
}

.m3-fab--primary-container {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-fab--secondary-container {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-fab--tertiary-container {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-fab--primary {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-fab--secondary {
  background: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}

.m3-fab--tertiary {
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}

.m3-fab:disabled {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  box-shadow: none;
  pointer-events: none;
}
</style>
