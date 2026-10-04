<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from "vue";
import { useHaptics } from "../../composables/services.js";

/**
 * The Expressive slider: a thick track split by a slim handle bar with gaps around it, a stop dot
 * at the end, and a value bubble while dragging. Five sizes; M and up can carry an inset icon in
 * `#icon`. Drags horizontally without blocking vertical page scroll; arrows, Page keys, Home and
 * End adjust it from the keyboard.
 *
 * @see https://m3.material.io/components/sliders/specs
 */
type SliderSize = "xs" | "s" | "m" | "l" | "xl";

const props = withDefaults(
  defineProps<{
    label: string;
    min?: number;
    max?: number;
    step?: number;
    size?: SliderSize;
    ticks?: boolean;
    disabled?: boolean;
    format?: (value: number) => string;
  }>(),
  { min: 0, max: 100, step: 1, size: "xs", ticks: false, disabled: false },
);

const value = defineModel<number>({ default: 0 });
const root = useTemplateRef<HTMLElement>("root");
const dragging = shallowRef(false);
const haptics = useHaptics();

const SIZES: Record<SliderSize, [track: number, handle: number, radius: number]> = {
  xs: [16, 44, 8],
  s: [24, 44, 8],
  m: [40, 52, 12],
  l: [56, 68, 16],
  xl: [96, 108, 28],
};

const ratio = computed(() => {
  const span = props.max - props.min;
  return span > 0 ? Math.min(1, Math.max(0, (value.value - props.min) / span)) : 0;
});
const label = computed(() => (props.format ? props.format(value.value) : String(value.value)));
const tickCount = computed(() =>
  props.ticks && props.step > 0 ? Math.floor((props.max - props.min) / props.step) + 1 : 0,
);
const style = computed(() => {
  const [track, handle, radius] = SIZES[props.size];
  return {
    "--m3-slider-ratio": String(ratio.value),
    "--m3-slider-track": `${track}px`,
    "--m3-slider-handle": `${handle}px`,
    "--m3-slider-radius": `${radius}px`,
  };
});

function snap(raw: number): number {
  const stepped =
    props.step > 0 ? Math.round((raw - props.min) / props.step) * props.step + props.min : raw;
  const clamped = Math.min(props.max, Math.max(props.min, stepped));
  return Number(clamped.toFixed(10));
}

function set(next: number) {
  const snapped = snap(next);
  if (snapped === value.value) return;
  value.value = snapped;
  if (props.ticks) haptics.tick();
}

function fromPointer(clientX: number) {
  const rect = root.value!.getBoundingClientRect();
  const rtl = getComputedStyle(root.value!).direction === "rtl";
  const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  set(props.min + (rtl ? 1 - fraction : fraction) * (props.max - props.min));
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return;
  dragging.value = true;
  root.value!.setPointerCapture(event.pointerId);
  fromPointer(event.clientX);
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) fromPointer(event.clientX);
}

function onPointerUp(event: PointerEvent) {
  if (!dragging.value) return;
  dragging.value = false;
  root.value?.releasePointerCapture(event.pointerId);
}

function onKeydown(event: KeyboardEvent) {
  const step = props.step > 0 ? props.step : (props.max - props.min) / 100;
  const page = Math.max(step, (props.max - props.min) / 10);
  const rtl = getComputedStyle(root.value!).direction === "rtl";
  const actions: Record<string, () => number> = {
    ArrowRight: () => value.value + (rtl ? -step : step),
    ArrowLeft: () => value.value - (rtl ? -step : step),
    ArrowUp: () => value.value + step,
    ArrowDown: () => value.value - step,
    PageUp: () => value.value + page,
    PageDown: () => value.value - page,
    Home: () => props.min,
    End: () => props.max,
  };
  const action = actions[event.key];
  if (!action || props.disabled) return;
  event.preventDefault();
  set(action());
}
</script>

<template>
  <div
    ref="root"
    class="m3-slider m3-focus-ring"
    :class="{ 'm3-slider--dragging': dragging, 'm3-slider--disabled': props.disabled }"
    :style="style"
    role="slider"
    :tabindex="props.disabled ? -1 : 0"
    :aria-label="props.label"
    :aria-valuemin="props.min"
    :aria-valuemax="props.max"
    :aria-valuenow="value"
    :aria-valuetext="label"
    :aria-disabled="props.disabled || undefined"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <span class="m3-slider__active" aria-hidden="true">
      <span v-if="$slots.icon && props.size !== 'xs' && props.size !== 's'" class="m3-slider__icon"
        ><slot name="icon"
      /></span>
    </span>
    <span class="m3-slider__inactive" aria-hidden="true" />
    <span v-if="tickCount > 1" class="m3-slider__ticks" aria-hidden="true">
      <span
        v-for="index in tickCount"
        :key="index"
        :class="{ 'm3-slider__tick--active': (index - 1) / (tickCount - 1) <= ratio }"
        :style="{ insetInlineStart: `${((index - 1) / (tickCount - 1)) * 100}%` }"
      />
    </span>
    <span v-else class="m3-slider__stop" aria-hidden="true" />
    <span class="m3-slider__handle" aria-hidden="true">
      <span class="m3-slider__bubble">{{ label }}</span>
    </span>
  </div>
</template>

<style scoped>
.m3-slider {
  --m3-slider-gap: 6px;
  --m3-slider-handle-width: 4px;
  --m3-slider-x: calc(var(--m3-slider-ratio) * 100%);
  position: relative;
  height: max(48px, var(--m3-slider-handle));
  touch-action: pan-y;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-slider__active,
.m3-slider__inactive {
  position: absolute;
  top: 50%;
  height: var(--m3-slider-track);
  translate: 0 -50%;
  transition:
    width var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    inset-inline-start var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-slider__active {
  display: flex;
  align-items: center;
  inset-inline-start: 0;
  width: max(
    0px,
    calc(var(--m3-slider-x) - var(--m3-slider-gap) - var(--m3-slider-handle-width) / 2)
  );
  overflow: hidden;
  border-radius: var(--m3-slider-radius) 2px 2px var(--m3-slider-radius);
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-slider__inactive {
  inset-inline-start: calc(
    var(--m3-slider-x) + var(--m3-slider-gap) + var(--m3-slider-handle-width) / 2
  );
  width: max(
    0px,
    calc(100% - var(--m3-slider-x) - var(--m3-slider-gap) - var(--m3-slider-handle-width) / 2)
  );
  border-radius: 2px var(--m3-slider-radius) var(--m3-slider-radius) 2px;
  background: var(--md-sys-color-secondary-container);
}

:global([dir="rtl"] .m3-slider__active) {
  border-radius: 2px var(--m3-slider-radius) var(--m3-slider-radius) 2px;
}

:global([dir="rtl"] .m3-slider__inactive) {
  border-radius: var(--m3-slider-radius) 2px 2px var(--m3-slider-radius);
}

.m3-slider__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-inline-start: 8px;
  font-size: 24px;
}

.m3-slider__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-slider__stop {
  position: absolute;
  top: 50%;
  inset-inline-end: 6px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
  translate: 0 -50%;
}

.m3-slider__ticks {
  position: absolute;
  inset: 50% 6px auto;
  height: 0;
}

.m3-slider__ticks > span {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
  translate: -50% -50%;
}

.m3-slider__ticks > .m3-slider__tick--active {
  background: var(--md-sys-color-secondary-container);
}

.m3-slider__handle {
  position: absolute;
  top: 50%;
  inset-inline-start: var(--m3-slider-x);
  width: var(--m3-slider-handle-width);
  height: var(--m3-slider-handle);
  border-radius: 2px;
  background: var(--md-sys-color-primary);
  translate: -50% -50%;
  transition:
    inset-inline-start var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    width var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}

:global([dir="rtl"] .m3-slider__handle),
:global([dir="rtl"] .m3-slider__ticks > span) {
  translate: 50% -50%;
}

.m3-slider--dragging .m3-slider__handle {
  width: 2px;
}

.m3-slider--dragging .m3-slider__active,
.m3-slider--dragging .m3-slider__inactive,
.m3-slider--dragging .m3-slider__handle {
  transition: none;
}

.m3-slider__bubble {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  min-width: 48px;
  padding: 12px 16px;
  box-sizing: border-box;
  border-radius: 24px;
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-50%) scale(0.6);
  transform-origin: 50% 100%;
  pointer-events: none;
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-slider--dragging .m3-slider__bubble,
.m3-slider:focus-visible .m3-slider__bubble {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.m3-slider--disabled {
  opacity: 0.38;
  cursor: default;
  pointer-events: none;
}
</style>
