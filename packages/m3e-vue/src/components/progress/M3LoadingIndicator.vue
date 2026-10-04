<script setup lang="ts">
import {
  LOADING_ACTIVE_SCALE,
  createOutlineBuffer,
  determinateFrame,
  indeterminateFrame,
  outlinePath,
  type IndicatorFrame,
} from "@cavulsqa/m3e";
import { computed, onMounted, useTemplateRef, watch } from "vue";
import { useFrame } from "../../composables/useFrame.js";
import { useInView } from "../../composables/useInView.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";

/**
 * The Expressive loading indicator: seven shapes morphing in a loop for waits under five seconds
 * or so, or circle to soft burst for a known progress. It replaces the spinner. 48dp by default;
 * the size scales the whole indicator. Frames write the path directly, never through Vue, and stop
 * while it is off screen.
 *
 * @see https://m3.material.io/components/loading-indicator/guidelines
 */
const props = withDefaults(
  defineProps<{
    /** 0 to 1 for a determinate indicator; omit for indeterminate. */
    progress?: number;
    /** Sits in a `primary-container` circle, for loading over content. */
    contained?: boolean;
    size?: number;
    label?: string;
  }>(),
  { size: 48, label: "Loading" },
);

const root = useTemplateRef<HTMLElement>("root");
const path = useTemplateRef<SVGPathElement>("path");
const visible = useInView(root);
const reduced = useReducedMotion();
const buffer = createOutlineBuffer();
const determinate = computed(() => props.progress !== undefined);
let startedAt = 0;

function draw(frame: IndicatorFrame) {
  const element = path.value;
  if (!element) return;
  element.setAttribute("d", outlinePath(frame.outline, frame.scale * LOADING_ACTIVE_SCALE));
  element.style.rotate = `${frame.rotation}deg`;
}

useFrame(
  (now) => {
    if (startedAt === 0) startedAt = now;
    draw(indeterminateFrame(now - startedAt, buffer, { rotate: !reduced.value }));
  },
  () => !determinate.value && visible.value,
);

watch(
  () => props.progress,
  (progress) => {
    if (progress !== undefined) draw(determinateFrame(progress, buffer));
  },
);

onMounted(() =>
  draw(
    determinate.value ? determinateFrame(props.progress!, buffer) : indeterminateFrame(0, buffer),
  ),
);
</script>

<template>
  <div
    ref="root"
    class="m3-loading"
    :class="{ 'm3-loading--contained': props.contained }"
    role="progressbar"
    :aria-label="props.label"
    :aria-valuemin="determinate ? 0 : undefined"
    :aria-valuemax="determinate ? 100 : undefined"
    :aria-valuenow="determinate ? Math.round(props.progress! * 100) : undefined"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
  >
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path ref="path" />
    </svg>
  </div>
</template>

<style scoped>
.m3-loading {
  display: inline-grid;
  place-items: center;
  flex: none;
  color: var(--md-sys-color-primary);
}

.m3-loading--contained {
  border-radius: 50%;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

path {
  fill: currentColor;
  transform-origin: 50px 50px;
}
</style>
