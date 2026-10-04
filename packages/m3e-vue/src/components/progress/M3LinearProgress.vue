<script setup lang="ts">
import {
  LINEAR_INDETERMINATE_WAVELENGTH,
  LINEAR_STOP_SIZE,
  LINEAR_WAVE,
  linearIndeterminateSegments,
  linearPaths,
} from "@cavulsqa/m3e";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { createWaveMotion } from "../../composables/useWaveMotion.js";
import { useElementSize } from "../../composables/useElementSize.js";
import { useFrame } from "../../composables/useFrame.js";
import { useInView } from "../../composables/useInView.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";

/**
 * The Expressive linear progress indicator: a wave that travels while work is mid-way, flat near
 * empty and full, a gap before the track and a stop dot at its end. Omit `value` for the
 * indeterminate variant. Mirrors itself in right-to-left layouts.
 *
 * @see https://m3.material.io/components/progress-indicators/specs
 */
const props = withDefaults(
  defineProps<{
    /** 0 to 1; omit for indeterminate. */
    value?: number;
    wavy?: boolean;
    thickness?: number;
    label?: string;
  }>(),
  { wavy: true, thickness: LINEAR_WAVE.thickness, label: "Progress" },
);

const root = useTemplateRef<HTMLElement>("root");
const active = useTemplateRef<SVGPathElement>("active");
const track = useTemplateRef<SVGPathElement>("track");
const stop = useTemplateRef<SVGCircleElement>("stop");
const { width } = useElementSize(root);
const visible = useInView(root);
const reduced = useReducedMotion();
const rtl = shallowRef(false);
const indeterminate = computed(() => props.value === undefined);
const wavy = computed(() => props.wavy && !reduced.value);
const motion = createWaveMotion();
const shape = computed(() => ({
  ...LINEAR_WAVE,
  thickness: props.thickness,
  wavelength: indeterminate.value ? LINEAR_INDETERMINATE_WAVELENGTH : LINEAR_WAVE.wavelength,
}));
const height = computed(() => shape.value.thickness + LINEAR_WAVE.amplitude * 2);
const settled = shallowRef(false);

function draw(now: number) {
  const w = width.value;
  if (w <= 0 || !active.value || !track.value) return;
  const sample = motion.sample(now);
  const segments = indeterminate.value
    ? linearIndeterminateSegments(now)
    : [[0, sample.progress] as const];
  const amplitude = indeterminate.value ? (wavy.value ? 1 : 0) : sample.amplitude;
  const paths = linearPaths(
    w,
    segments,
    shape.value,
    amplitude,
    wavy.value ? sample.phase : 0,
    !indeterminate.value,
  );
  active.value.setAttribute("d", paths.active);
  track.value.setAttribute("d", paths.track);
  if (stop.value) {
    stop.value.style.display = paths.stop ? "" : "none";
    if (paths.stop) {
      stop.value.setAttribute("cx", String(paths.stop.x));
      stop.value.setAttribute("cy", String(paths.stop.y));
    }
  }
  settled.value = !indeterminate.value && sample.settled;
}

useFrame(
  (now) => draw(now),
  () => visible.value && width.value > 0 && !settled.value,
);

watch(
  [() => props.value, wavy],
  ([value]) => {
    motion.setTarget(value ?? 0, performance.now(), wavy.value);
    settled.value = false;
  },
  { immediate: true },
);

watch([width, () => props.thickness], () => {
  settled.value = false;
  draw(performance.now());
});

onMounted(() => {
  if (root.value) rtl.value = getComputedStyle(root.value).direction === "rtl";
  draw(performance.now());
});
</script>

<template>
  <div
    ref="root"
    class="m3-linear-progress"
    role="progressbar"
    :aria-label="props.label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="indeterminate ? undefined : Math.round(props.value! * 100)"
    :style="{ height: `${height}px` }"
  >
    <svg
      :viewBox="`0 0 ${Math.max(width, 1)} ${height}`"
      :style="{ transform: rtl ? 'scaleX(-1)' : undefined }"
      aria-hidden="true"
    >
      <path ref="track" class="m3-linear-progress__track" :stroke-width="props.thickness" />
      <path ref="active" class="m3-linear-progress__active" :stroke-width="props.thickness" />
      <circle ref="stop" class="m3-linear-progress__stop" :r="LINEAR_STOP_SIZE / 2" />
    </svg>
  </div>
</template>

<style scoped>
.m3-linear-progress {
  display: block;
  width: 100%;
  min-width: 40px;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.m3-linear-progress__active {
  stroke: var(--md-sys-color-primary);
}

.m3-linear-progress__track {
  stroke: var(--md-sys-color-secondary-container);
}

.m3-linear-progress__stop {
  fill: var(--md-sys-color-primary);
}
</style>
