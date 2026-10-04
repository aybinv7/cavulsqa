<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from "vue";
import { useHaptics } from "../../composables/services.js";
import { moveThumb, nearestThumb, type RangeThumb } from "../../utils/range.js";

/**
 * Compose's `RangeSlider` in the Expressive dress of `M3Slider`: two slim handles on a thick track,
 * the span between them in `primary`, a 6dp gap either side of each handle, 2dp corners where the
 * track meets a handle and full ones at the ends, a stop dot in `primary` at each end. A press
 * moves the nearer handle; each handle is its own keyboard slider. `min-distance` keeps the two
 * apart - Compose enforces none, so the default lets them meet.
 *
 * @see https://m3.material.io/components/sliders/specs
 */
type SliderSize = "xs" | "s" | "m" | "l" | "xl";

const props = withDefaults(
  defineProps<{
    startLabel: string;
    endLabel: string;
    min?: number;
    max?: number;
    step?: number;
    minDistance?: number;
    size?: SliderSize;
    ticks?: boolean;
    disabled?: boolean;
    format?: (value: number) => string;
  }>(),
  { min: 0, max: 100, step: 1, minDistance: 0, size: "xs", ticks: false, disabled: false },
);

const start = defineModel<number>("start", { default: 0 });
const end = defineModel<number>("end", { default: 100 });
const root = useTemplateRef<HTMLElement>("root");
const dragging = shallowRef<RangeThumb | null>(null);
const haptics = useHaptics();

const SIZES: Record<SliderSize, [track: number, handle: number, radius: number]> = {
  xs: [16, 44, 8],
  s: [24, 44, 8],
  m: [40, 52, 12],
  l: [56, 68, 16],
  xl: [96, 108, 28],
};

const span = computed(() => props.max - props.min);
const ratioOf = (value: number) =>
  span.value > 0 ? Math.min(1, Math.max(0, (value - props.min) / span.value)) : 0;
const text = (value: number) => (props.format ? props.format(value) : String(value));

const style = computed(() => {
  const [track, handle, radius] = SIZES[props.size];
  return {
    "--m3-range-start": String(ratioOf(start.value)),
    "--m3-range-end": String(ratioOf(end.value)),
    "--m3-slider-track": `${track}px`,
    "--m3-slider-handle": `${handle}px`,
    "--m3-slider-radius": `${radius}px`,
  };
});

const ticks = computed(() => {
  if (!props.ticks || props.step <= 0) return [];
  const count = Math.floor(span.value / props.step) + 1;
  return Array.from({ length: count }, (_, index) => {
    const value = props.min + index * props.step;
    return { value, ratio: ratioOf(value), inside: value >= start.value && value <= end.value };
  });
});

const bounds = computed(() => ({
  min: props.min,
  max: props.max,
  step: props.step,
  minDistance: props.minDistance,
}));

function set(thumb: RangeThumb, next: number) {
  const moved = moveThumb(thumb, next, { start: start.value, end: end.value }, bounds.value);
  if (moved.start === start.value && moved.end === end.value) return;
  start.value = moved.start;
  end.value = moved.end;
  if (props.ticks) haptics.tick();
}

function valueAt(clientX: number): number {
  const rect = root.value!.getBoundingClientRect();
  const rtl = getComputedStyle(root.value!).direction === "rtl";
  const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return props.min + (rtl ? 1 - fraction : fraction) * span.value;
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return;
  const value = valueAt(event.clientX);
  const thumb = nearestThumb(value, start.value, end.value);
  dragging.value = thumb;
  root.value!.setPointerCapture(event.pointerId);
  set(thumb, value);
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) set(dragging.value, valueAt(event.clientX));
}

function onPointerUp(event: PointerEvent) {
  if (!dragging.value) return;
  dragging.value = null;
  root.value?.releasePointerCapture(event.pointerId);
}

function onKeydown(thumb: RangeThumb, event: KeyboardEvent) {
  const step = props.step > 0 ? props.step : span.value / 100;
  const page = Math.max(step, span.value / 10);
  const rtl = getComputedStyle(root.value!).direction === "rtl";
  const current = thumb === "start" ? start.value : end.value;
  const actions: Record<string, () => number> = {
    ArrowRight: () => current + (rtl ? -step : step),
    ArrowLeft: () => current - (rtl ? -step : step),
    ArrowUp: () => current + step,
    ArrowDown: () => current - step,
    PageUp: () => current + page,
    PageDown: () => current - page,
    Home: () => props.min,
    End: () => props.max,
  };
  const action = actions[event.key];
  if (!action || props.disabled) return;
  event.preventDefault();
  set(thumb, action());
}
</script>

<template>
  <div
    ref="root"
    class="m3-range-slider"
    :class="{
      'm3-range-slider--disabled': props.disabled,
      [`m3-range-slider--dragging-${dragging}`]: dragging,
    }"
    :style="style"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span class="m3-range-slider__track m3-range-slider__track--before" aria-hidden="true" />
    <span class="m3-range-slider__track m3-range-slider__track--active" aria-hidden="true" />
    <span class="m3-range-slider__track m3-range-slider__track--after" aria-hidden="true" />
    <span v-if="ticks.length > 1" class="m3-range-slider__ticks" aria-hidden="true">
      <span
        v-for="tick in ticks"
        :key="tick.value"
        :class="{ 'm3-range-slider__tick--inside': tick.inside }"
        :style="{ insetInlineStart: `${tick.ratio * 100}%` }"
      />
    </span>
    <template v-else>
      <span class="m3-range-slider__stop m3-range-slider__stop--start" aria-hidden="true" />
      <span class="m3-range-slider__stop m3-range-slider__stop--end" aria-hidden="true" />
    </template>
    <span
      class="m3-range-slider__handle m3-range-slider__handle--start m3-focus-ring"
      role="slider"
      :tabindex="props.disabled ? -1 : 0"
      :aria-label="props.startLabel"
      :aria-valuemin="props.min"
      :aria-valuemax="end"
      :aria-valuenow="start"
      :aria-valuetext="text(start)"
      :aria-disabled="props.disabled || undefined"
      @keydown="onKeydown('start', $event)"
    >
      <span class="m3-range-slider__bubble">{{ text(start) }}</span>
    </span>
    <span
      class="m3-range-slider__handle m3-range-slider__handle--end m3-focus-ring"
      role="slider"
      :tabindex="props.disabled ? -1 : 0"
      :aria-label="props.endLabel"
      :aria-valuemin="start"
      :aria-valuemax="props.max"
      :aria-valuenow="end"
      :aria-valuetext="text(end)"
      :aria-disabled="props.disabled || undefined"
      @keydown="onKeydown('end', $event)"
    >
      <span class="m3-range-slider__bubble">{{ text(end) }}</span>
    </span>
  </div>
</template>

<style scoped>
.m3-range-slider {
  --m3-slider-gap: 6px;
  --m3-slider-handle-width: 4px;
  --m3-range-a: calc(var(--m3-range-start) * 100%);
  --m3-range-b: calc(var(--m3-range-end) * 100%);
  --m3-range-clear: calc(var(--m3-slider-gap) + var(--m3-slider-handle-width) / 2);
  position: relative;
  height: max(48px, var(--m3-slider-handle));
  touch-action: pan-y;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-range-slider__track {
  position: absolute;
  top: 50%;
  height: var(--m3-slider-track);
  translate: 0 -50%;
}

.m3-range-slider__track--before {
  inset-inline-start: 0;
  width: max(0px, calc(var(--m3-range-a) - var(--m3-range-clear)));
  border-start-start-radius: var(--m3-slider-radius);
  border-end-start-radius: var(--m3-slider-radius);
  border-start-end-radius: 2px;
  border-end-end-radius: 2px;
  background: var(--md-sys-color-secondary-container);
}

.m3-range-slider__track--active {
  inset-inline-start: calc(var(--m3-range-a) + var(--m3-range-clear));
  width: max(0px, calc(var(--m3-range-b) - var(--m3-range-a) - 2 * var(--m3-range-clear)));
  border-radius: 2px;
  background: var(--md-sys-color-primary);
}

.m3-range-slider__track--after {
  inset-inline-start: calc(var(--m3-range-b) + var(--m3-range-clear));
  width: max(0px, calc(100% - var(--m3-range-b) - var(--m3-range-clear)));
  border-start-start-radius: 2px;
  border-end-start-radius: 2px;
  border-start-end-radius: var(--m3-slider-radius);
  border-end-end-radius: var(--m3-slider-radius);
  background: var(--md-sys-color-secondary-container);
}

.m3-range-slider__stop {
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
  translate: 0 -50%;
}

.m3-range-slider__stop--start {
  inset-inline-start: 6px;
}

.m3-range-slider__stop--end {
  inset-inline-end: 6px;
}

.m3-range-slider__ticks {
  position: absolute;
  inset: 50% 6px auto;
  height: 0;
}

.m3-range-slider__ticks > span {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
  translate: -50% -50%;
}

.m3-range-slider__ticks > .m3-range-slider__tick--inside {
  background: var(--md-sys-color-secondary-container);
}

.m3-range-slider__handle {
  position: absolute;
  top: 50%;
  width: var(--m3-slider-handle-width);
  height: var(--m3-slider-handle);
  border-radius: 2px;
  background: var(--md-sys-color-primary);
  translate: -50% -50%;
  outline-offset: 4px;
}

.m3-range-slider__handle--start {
  inset-inline-start: var(--m3-range-a);
}

.m3-range-slider__handle--end {
  inset-inline-start: var(--m3-range-b);
}

:global([dir="rtl"] .m3-range-slider__handle),
:global([dir="rtl"] .m3-range-slider__ticks > span) {
  translate: 50% -50%;
}

.m3-range-slider--dragging-start .m3-range-slider__handle--start,
.m3-range-slider--dragging-end .m3-range-slider__handle--end {
  width: 2px;
}

.m3-range-slider__bubble {
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

.m3-range-slider--dragging-start .m3-range-slider__handle--start .m3-range-slider__bubble,
.m3-range-slider--dragging-end .m3-range-slider__handle--end .m3-range-slider__bubble,
.m3-range-slider__handle:focus-visible .m3-range-slider__bubble {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.m3-range-slider--disabled {
  opacity: 0.38;
  cursor: default;
  pointer-events: none;
}
</style>
