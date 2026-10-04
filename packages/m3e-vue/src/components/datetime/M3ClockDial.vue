<script setup lang="ts">
import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { useHaptics } from "../../composables/services.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import {
  dialHandle,
  dialLabels,
  dialValueAt,
  polarPoint,
  type DialMode,
} from "../../utils/clockDial.js";

/**
 * The time picker's clock face: tap or drag a number for the hour or the minute. The handle
 * follows the finger and springs to a tapped value the short way round; the number under it turns
 * `onPrimary` through a second label layer clipped to the handle, moved on the same frame. Each new value ticks; lifting
 * the finger emits `release`, which the picker uses to move on from hours to minutes.
 */
const props = withDefaults(
  defineProps<{
    mode: DialMode;
    hour24?: boolean;
    pm?: boolean;
    size?: number;
    locale?: string;
    label?: string;
  }>(),
  { hour24: false, pm: false, size: 256 },
);

const value = defineModel<number>("value", { required: true });
const emit = defineEmits<{ release: [] }>();

const root = useTemplateRef<HTMLElement>("root");
const haptics = useHaptics();
const reduced = useReducedMotion();
const dragging = shallowRef(false);
const spring = MOTION_SCHEMES.expressive.defaultSpatial.spring;
let animation: SpringAnimation | null = null;

const number = computed(
  () => new Intl.NumberFormat(props.locale, { minimumIntegerDigits: 2, useGrouping: false }),
);
const labels = computed(() =>
  dialLabels(props.mode, props.hour24, props.size, (v) => number.value.format(v)),
);
const handle = computed(() => dialHandle(value.value, props.mode, props.hour24, props.size));

/** `angle` keeps counting past 360 so the hand never unwinds the long way. */
const shown = shallowRef({ ...handle.value });
const clip = computed(() => {
  const { x, y } = polarPoint(shown.value.angle, shown.value.radius, props.size);
  return `circle(24px at ${x}px ${y}px)`;
});

watch(handle, (target) => {
  animation?.stop();
  const from = { ...shown.value };
  let delta = target.angle - (((from.angle % 360) + 360) % 360);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const to = { angle: from.angle + delta, radius: target.radius };
  if (dragging.value || reduced.value) {
    shown.value = to;
    return;
  }
  animation = animateSpring({
    from: 0,
    to: 1,
    spring,
    restDelta: 0.001,
    onFrame: (progress) =>
      (shown.value = {
        angle: from.angle + (to.angle - from.angle) * progress,
        radius: from.radius + (to.radius - from.radius) * progress,
      }),
  });
});

onBeforeUnmount(() => animation?.stop());

function pick(event: PointerEvent, snapFive: boolean) {
  const rect = root.value!.getBoundingClientRect();
  const scale = props.size / rect.width;
  const next = dialValueAt(
    (event.clientX - rect.left) * scale,
    (event.clientY - rect.top) * scale,
    props.size,
    props.mode,
    props.hour24,
    { snapFive, pm: props.pm },
  );
  if (next !== value.value) {
    value.value = next;
    haptics.tick();
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  dragging.value = true;
  root.value?.setPointerCapture(event.pointerId);
  pick(event, props.mode === "minute");
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) pick(event, false);
}

function onPointerUp() {
  if (!dragging.value) return;
  dragging.value = false;
  emit("release");
}

function onKeydown(event: KeyboardEvent) {
  const steps: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
  const step = steps[event.key];
  if (step === undefined) return;
  event.preventDefault();
  const span = props.mode === "minute" ? 60 : props.hour24 ? 24 : 12;
  const base = props.mode === "hour" && !props.hour24 ? value.value % 12 : value.value;
  const next = (base + step + span) % span;
  value.value = props.mode === "hour" && !props.hour24 && props.pm ? next + 12 : next;
}
</script>

<template>
  <div
    ref="root"
    class="m3-clock-dial"
    :class="{ 'm3-clock-dial--dragging': dragging }"
    :style="{ '--m3-dial-size': `${props.size}px` }"
    role="slider"
    tabindex="0"
    data-sheet-ignore
    :aria-label="props.label"
    :aria-valuenow="value"
    :aria-valuemin="0"
    :aria-valuemax="props.mode === 'minute' ? 59 : 23"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <div
      class="m3-clock-dial__hand"
      :style="{ rotate: `${shown.angle}deg`, '--m3-dial-radius': `${shown.radius}px` }"
      aria-hidden="true"
    >
      <span class="m3-clock-dial__track" />
      <span class="m3-clock-dial__handle" />
    </div>
    <span class="m3-clock-dial__dot" aria-hidden="true" />
    <div class="m3-clock-dial__labels" aria-hidden="true">
      <span
        v-for="item in labels"
        :key="`${item.inner}-${item.value}`"
        class="m3-clock-dial__label"
        :class="{ 'm3-clock-dial__label--inner': item.inner }"
        :style="{ left: `${item.x}px`, top: `${item.y}px` }"
        >{{ item.text }}</span
      >
    </div>
    <div
      class="m3-clock-dial__labels m3-clock-dial__labels--selected"
      :style="{ clipPath: clip }"
      aria-hidden="true"
    >
      <span
        v-for="item in labels"
        :key="`${item.inner}-${item.value}`"
        class="m3-clock-dial__label"
        :class="{ 'm3-clock-dial__label--inner': item.inner }"
        :style="{ left: `${item.x}px`, top: `${item.y}px` }"
        >{{ item.text }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.m3-clock-dial {
  position: relative;
  flex: none;
  width: var(--m3-dial-size);
  height: var(--m3-dial-size);
  border-radius: 50%;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  touch-action: none;
  user-select: none;
  cursor: pointer;
  outline: none;
}

.m3-clock-dial:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: 2px;
}

.m3-clock-dial__hand {
  position: absolute;
  inset: 0;
}

.m3-clock-dial__track {
  position: absolute;
  left: calc(50% - 1px);
  bottom: 50%;
  width: 2px;
  height: var(--m3-dial-radius);
  background: var(--md-sys-color-primary);
}

.m3-clock-dial__handle {
  position: absolute;
  left: calc(50% - 24px);
  top: calc(50% - var(--m3-dial-radius) - 24px);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
}

.m3-clock-dial__dot {
  position: absolute;
  left: calc(50% - 4px);
  top: calc(50% - 4px);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
}

.m3-clock-dial__labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.m3-clock-dial__labels--selected {
  color: var(--md-sys-color-on-primary);
}

.m3-clock-dial__label {
  position: absolute;
  translate: -50% -50%;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  font-variant-numeric: tabular-nums;
}

.m3-clock-dial__label--inner {
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}
</style>
