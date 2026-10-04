<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import M3IconButton from "../button/M3IconButton.vue";
import { computed, shallowRef } from "vue";
import { useAutoRepeat } from "../../composables/useAutoRepeat.js";
import { useHaptics } from "../../composables/services.js";
import { decimalsOf, parseTyped, repeatSteps, snapStep, stepBy } from "../../utils/stepper.js";

/**
 * Framework7's stepper in Material dress: minus and plus around the value, for small quantities
 * where a slider is too coarse and a keyboard too slow - items in a cart, guests, a dose. Holding a
 * button repeats and, across a wide range, speeds up as Framework7's dynamic auto-repeat does.
 * `editable` lets the value be typed (a decimal comma is accepted); it snaps to the step on commit.
 *
 * The value is one spinbutton: arrow keys step, Page keys move ten steps, Home and End jump to the
 * bounds. The buttons are for pointers and stay out of the tab order. `outlined` wraps the three in
 * a pill; `tonal` sets two tonal buttons apart.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    min?: number;
    max?: number;
    step?: number;
    size?: "s" | "m";
    variant?: "outlined" | "tonal";
    editable?: boolean;
    disabled?: boolean;
    decrementLabel?: string;
    incrementLabel?: string;
    format?: (value: number) => string;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    size: "s",
    variant: "outlined",
    editable: false,
    disabled: false,
    decrementLabel: "Decrease",
    incrementLabel: "Increase",
  },
);

const value = defineModel<number>({ default: 0 });
const haptics = useHaptics();
const typing = shallowRef<string | null>(null);

const bounds = computed(() => ({ min: props.min, max: props.max, step: props.step }));
const atMin = computed(() => value.value <= props.min);
const atMax = computed(() => value.value >= props.max);
const raw = (number: number) => number.toFixed(decimalsOf(props.step));
const shown = computed(
  () => typing.value ?? (props.format ? props.format(value.value) : raw(value.value)),
);
const width = computed(() => {
  const widest = [props.min, props.max].map((bound) =>
    props.format ? props.format(bound) : raw(bound),
  );
  return `${Math.max(2, ...widest.map((text) => text.length)) + 1}ch`;
});

function commit(next: number): boolean {
  if (next === value.value) return false;
  value.value = next;
  haptics.tick();
  return true;
}

function move(steps: number): boolean {
  if (props.disabled) return false;
  return commit(stepBy(value.value, steps, bounds.value));
}

const decrement = useAutoRepeat({
  onStep: (held) => move(-repeatSteps(held, bounds.value)),
});
const increment = useAutoRepeat({
  onStep: (held) => move(repeatSteps(held, bounds.value)),
});

function onButtonClick(direction: -1 | 1, event: MouseEvent) {
  const repeat = direction < 0 ? decrement : increment;
  if (!repeat.consumedByPress(event)) move(direction);
}

function onKeydown(event: KeyboardEvent) {
  const moves: Record<string, () => number> = {
    ArrowUp: () => stepBy(value.value, 1, bounds.value),
    ArrowDown: () => stepBy(value.value, -1, bounds.value),
    PageUp: () => stepBy(value.value, 10, bounds.value),
    PageDown: () => stepBy(value.value, -10, bounds.value),
    Home: () => props.min,
    End: () => props.max,
  };
  const action = moves[event.key];
  if (!action || props.disabled) return;
  event.preventDefault();
  typing.value = null;
  commit(action());
}

function onInput(event: Event) {
  typing.value = (event.target as HTMLInputElement).value;
}

function onCommit() {
  if (typing.value === null) return;
  const parsed = parseTyped(typing.value);
  typing.value = null;
  if (parsed !== null) commit(snapStep(parsed, bounds.value));
}
</script>

<template>
  <div
    class="m3-stepper"
    :class="[
      `m3-stepper--${props.variant}`,
      `m3-stepper--${props.size}`,
      { 'm3-stepper--disabled': props.disabled },
    ]"
    role="group"
    :aria-label="props.label"
  >
    <M3IconButton
      class="m3-stepper__button"
      :label="props.decrementLabel"
      :variant="props.variant === 'tonal' ? 'tonal' : 'standard'"
      :size="props.size"
      :disabled="props.disabled || atMin"
      tabindex="-1"
      @pointerdown="decrement.onPointerDown"
      @pointerleave="decrement.onPointerLeave"
      @contextmenu.prevent
      @click="onButtonClick(-1, $event)"
    >
      <M3Glyph name="remove" />
    </M3IconButton>
    <input
      class="m3-stepper__value"
      role="spinbutton"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :value="shown"
      :readonly="!props.editable"
      :disabled="props.disabled"
      :aria-label="props.label"
      :aria-valuenow="value"
      :aria-valuemin="props.min"
      :aria-valuemax="props.max"
      :aria-valuetext="props.format ? props.format(value) : undefined"
      :style="{ width }"
      @focus="props.editable && props.format && (typing = raw(value))"
      @input="onInput"
      @change="onCommit"
      @blur="onCommit"
      @keydown.enter.prevent="onCommit"
      @keydown="onKeydown"
    />
    <M3IconButton
      class="m3-stepper__button"
      :label="props.incrementLabel"
      :variant="props.variant === 'tonal' ? 'tonal' : 'standard'"
      :size="props.size"
      :disabled="props.disabled || atMax"
      tabindex="-1"
      @pointerdown="increment.onPointerDown"
      @pointerleave="increment.onPointerLeave"
      @contextmenu.prevent
      @click="onButtonClick(1, $event)"
    >
      <M3Glyph name="add" />
    </M3IconButton>
  </div>
</template>

<style scoped>
.m3-stepper {
  display: inline-flex;
  flex: none;
  align-self: flex-start;
  width: max-content;
  align-items: center;
  box-sizing: border-box;
  color: var(--md-sys-color-on-surface);
}

.m3-stepper--outlined {
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
}

.m3-stepper--tonal {
  gap: 8px;
}

.m3-stepper__button {
  -webkit-touch-callout: none;
  user-select: none;
}

.m3-stepper__button :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-stepper__value {
  box-sizing: content-box;
  min-width: 2ch;
  margin: 0;
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
  caret-color: var(--md-sys-color-primary);
}

.m3-stepper--m .m3-stepper__value {
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
}

.m3-stepper__value:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: 2px;
}

.m3-stepper__value[readonly] {
  cursor: default;
}

.m3-stepper--disabled {
  opacity: 0.38;
}
</style>
