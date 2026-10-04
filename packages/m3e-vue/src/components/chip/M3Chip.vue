<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";

/**
 * An M3 chip, 32dp with 8dp corners. `assist` and `suggestion` act; `filter` toggles with
 * `v-model:selected` and shows a check when on; `input` represents an entry and can be removed
 * (`removable` emits `remove`). `elevated` lifts it off busy backgrounds.
 *
 * @see https://m3.material.io/components/chips/specs
 */
const props = withDefaults(
  defineProps<{
    label: string;
    kind?: "assist" | "filter" | "input" | "suggestion";
    elevated?: boolean;
    removable?: boolean;
    removeLabel?: string;
    disabled?: boolean;
  }>(),
  { kind: "assist", elevated: false, removable: false, removeLabel: "Remove", disabled: false },
);

const selected = defineModel<boolean>("selected", { default: false });
const emit = defineEmits<{ click: [event: MouseEvent]; remove: [] }>();
const haptics = useHaptics();
const isSelected = computed(
  () => (props.kind === "filter" || props.kind === "input") && selected.value,
);

function onClick(event: MouseEvent) {
  if (props.disabled) return;
  if (props.kind === "filter") {
    selected.value = !selected.value;
    haptics.tick();
  }
  emit("click", event);
}
</script>

<template>
  <span
    class="m3-chip"
    :class="[
      `m3-chip--${props.kind}`,
      {
        'm3-chip--selected': isSelected,
        'm3-chip--elevated': props.elevated,
        'm3-chip--disabled': props.disabled,
      },
    ]"
  >
    <button
      v-ripple="!props.disabled"
      type="button"
      class="m3-chip__action m3-state m3-focus-ring m3-target"
      :disabled="props.disabled"
      :aria-pressed="props.kind === 'filter' ? selected : undefined"
      @click="onClick"
    >
      <span v-if="props.kind === 'filter'" class="m3-chip__check" aria-hidden="true">
        <M3Glyph name="check" />
      </span>
      <span v-if="$slots.icon" class="m3-chip__icon" aria-hidden="true"><slot name="icon" /></span>
      <span class="m3-chip__label">{{ props.label }}</span>
    </button>
    <button
      v-if="props.removable"
      v-ripple
      type="button"
      class="m3-chip__remove m3-state m3-focus-ring"
      :aria-label="`${props.removeLabel} ${props.label}`"
      :disabled="props.disabled"
      @click="emit('remove')"
    >
      <M3Glyph name="close" />
    </button>
  </span>
</template>

<style scoped>
.m3-chip {
  display: inline-flex;
  flex: none;
  max-width: 100%;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    box-shadow var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-chip--assist,
.m3-chip--suggestion {
  color: var(--md-sys-color-on-surface);
}

.m3-chip--elevated {
  background: var(--md-sys-color-surface-container-low);
  box-shadow: var(--md-sys-elevation-level1);
}

.m3-chip--selected {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  box-shadow: none;
}

.m3-chip__action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  padding: 0 16px;
  border: 0;
  border-radius: inherit;
  background: none;
  color: inherit;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  white-space: nowrap;
  cursor: pointer;
}

.m3-chip__action {
  min-width: 0;
}

.m3-chip__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m3-chip:has(.m3-chip__icon) .m3-chip__action,
.m3-chip--selected .m3-chip__action {
  padding-inline-start: 8px;
}

.m3-chip__check {
  display: grid;
  place-items: center;
  width: 0;
  margin-inline-end: -8px;
  overflow: hidden;
  transition:
    width var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    margin var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-chip--selected .m3-chip__check {
  width: 18px;
  margin-inline-end: 0;
}

.m3-chip__check svg,
.m3-chip__icon :deep(svg),
.m3-chip__remove svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.m3-chip__icon {
  display: grid;
  place-items: center;
  color: var(--md-sys-color-primary);
  font-size: 18px;
}

.m3-chip--selected .m3-chip__icon {
  color: inherit;
}

.m3-chip__remove {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-inline: -8px 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.m3-chip--disabled {
  opacity: 0.38;
  pointer-events: none;
}
</style>
