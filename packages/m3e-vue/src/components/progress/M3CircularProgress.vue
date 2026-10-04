<script setup lang="ts">
import {
  CIRCULAR_FLAT_SIZE,
  CIRCULAR_WAVE,
  CIRCULAR_WAVY_SIZE,
  FULL_RING,
  HALF_GAUGE,
  circularIndeterminateFrame,
  circularPaths,
} from "@cavulsqa/m3e";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { createWaveMotion } from "../../composables/useWaveMotion.js";
import { useFrame } from "../../composables/useFrame.js";
import { useInView } from "../../composables/useInView.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";

/**
 * The Expressive circular progress indicator: a wavy ring (48dp) or a flat one (40dp), or the
 * upper half as a gauge. The default slot sits centred inside - a percentage, an icon. Omit
 * `value` for the indeterminate variant; for short indeterminate waits prefer the loading
 * indicator.
 *
 * @see https://m3.material.io/components/progress-indicators/specs
 */
const props = withDefaults(
  defineProps<{
    value?: number;
    wavy?: boolean;
    size?: number;
    thickness?: number;
    gauge?: boolean;
    label?: string;
  }>(),
  { wavy: true, thickness: CIRCULAR_WAVE.thickness, gauge: false, label: "Progress" },
);

const root = useTemplateRef<HTMLElement>("root");
const group = useTemplateRef<SVGGElement>("group");
const active = useTemplateRef<SVGPathElement>("active");
const track = useTemplateRef<SVGPathElement>("track");
const visible = useInView(root);
const reduced = useReducedMotion();
const indeterminate = computed(() => props.value === undefined);
const wavy = computed(() => props.wavy && !reduced.value);
const size = computed(() => props.size ?? (props.wavy ? CIRCULAR_WAVY_SIZE : CIRCULAR_FLAT_SIZE));
const shape = computed(() => ({ ...CIRCULAR_WAVE, thickness: props.thickness }));
const arc = computed(() => (props.gauge ? HALF_GAUGE : FULL_RING));
const motion = createWaveMotion();
const settled = shallowRef(false);

function draw(now: number) {
  if (!active.value || !track.value || !group.value) return;
  const sample = motion.sample(now);
  let paths;
  let rotation = 0;
  if (indeterminate.value) {
    const frame = circularIndeterminateFrame(now);
    paths = circularPaths(
      size.value,
      0,
      frame.sweep,
      shape.value,
      wavy.value ? 1 : 0,
      wavy.value ? sample.phase : 0,
      arc.value,
    );
    rotation = reduced.value ? 0 : frame.rotation;
  } else {
    paths = circularPaths(
      size.value,
      0,
      sample.progress,
      shape.value,
      sample.amplitude,
      sample.phase,
      arc.value,
    );
  }
  active.value.setAttribute("d", paths.active);
  track.value.setAttribute("d", paths.track);
  group.value.style.rotate = rotation ? `${rotation}deg` : "";
  settled.value = !indeterminate.value && sample.settled;
}

useFrame(
  (now) => draw(now),
  () => visible.value && !settled.value,
);

watch(
  [() => props.value, wavy],
  ([value]) => {
    motion.setTarget(value ?? 0, performance.now(), wavy.value);
    settled.value = false;
  },
  { immediate: true },
);

watch([size, () => props.thickness, () => props.gauge], () => {
  settled.value = false;
  draw(performance.now());
});

onMounted(() => draw(performance.now()));
</script>

<template>
  <div
    ref="root"
    class="m3-circular-progress"
    role="progressbar"
    :aria-label="props.label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="indeterminate ? undefined : Math.round(props.value! * 100)"
    :style="{ width: `${size}px`, height: `${props.gauge ? size / 2 + props.thickness : size}px` }"
  >
    <svg :viewBox="`0 0 ${size} ${size}`" aria-hidden="true" :style="{ height: `${size}px` }">
      <g ref="group" class="m3-circular-progress__group">
        <path ref="track" class="m3-circular-progress__track" :stroke-width="props.thickness" />
        <path ref="active" class="m3-circular-progress__active" :stroke-width="props.thickness" />
      </g>
    </svg>
    <div v-if="$slots.default" class="m3-circular-progress__content"><slot /></div>
  </div>
</template>

<style scoped>
.m3-circular-progress {
  position: relative;
  display: inline-block;
  flex: none;
  overflow: visible;
}

svg {
  position: absolute;
  inset: 0 0 auto;
  width: 100%;
  overflow: visible;
}

.m3-circular-progress__group {
  transform-origin: center;
  transform-box: view-box;
}

path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.m3-circular-progress__active {
  stroke: var(--md-sys-color-primary);
}

.m3-circular-progress__track {
  stroke: var(--md-sys-color-secondary-container);
}

.m3-circular-progress__content {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
  font-variant-numeric: tabular-nums;
  color: var(--md-sys-color-on-surface);
}
</style>
