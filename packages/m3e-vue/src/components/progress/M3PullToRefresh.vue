<script setup lang="ts">
import {
  MOTION_SCHEMES,
  animateSpring,
  pullArmed,
  pullFraction,
  pullIndicatorOffset,
  pullOverRotation,
  type SpringAnimation,
} from "@cavulsqa/m3e";
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from "vue";
import M3LoadingIndicator from "./M3LoadingIndicator.vue";
import { usePullGesture } from "../../composables/usePullGesture.js";
import { useScrollContainer, type ScrollTarget } from "../../composables/useScrollContainer.js";
import { useHaptics } from "../../composables/services.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";

/**
 * Material 3 Expressive pull-to-refresh: pull the content down from its top and the loading
 * indicator follows at half speed, morphing as it goes; release past the threshold and it holds
 * while `refresh` runs, looping, then springs away. Place it first in the scrolling container (a
 * Framework7 `.page-content`); it sits under a sticky top app bar if there is one.
 *
 * @see https://m3.material.io/components/loading-indicator/guidelines
 */
const props = withDefaults(
  defineProps<{
    refresh: () => Promise<unknown>;
    label?: string;
    disabled?: boolean;
    scrollTarget?: ScrollTarget;
  }>(),
  { label: "Refreshing", disabled: false },
);

const emit = defineEmits<{ error: [error: unknown] }>();

const anchor = useTemplateRef<HTMLElement>("anchor");
const fraction = shallowRef(0);
const refreshing = shallowRef(false);
const top = shallowRef(0);
const haptics = useHaptics();
const reduced = useReducedMotion();
const spring = MOTION_SCHEMES.expressive.defaultSpatial.spring;
let animation: SpringAnimation | null = null;
let wasArmed = false;

const scroller = useScrollContainer(
  anchor,
  () => props.scrollTarget,
  () => undefined,
);

const offset = computed(() => pullIndicatorOffset(fraction.value));
const rotation = computed(() => (refreshing.value ? 0 : pullOverRotation(fraction.value)));
const visible = computed(() => fraction.value > 0.001 || refreshing.value);

function measureTop() {
  const bar = scroller.value?.querySelector<HTMLElement>(":scope > .m3-app-bar");
  top.value = bar ? bar.offsetHeight : 0;
}

function settleTo(target: number, velocity = 0): Promise<boolean> {
  animation?.stop();
  animation = animateSpring({
    from: fraction.value,
    to: target,
    spring,
    velocity,
    restDelta: 0.002,
    instant: reduced.value,
    onFrame: (value) => (fraction.value = Math.max(0, value)),
  });
  return animation.finished;
}

async function run() {
  refreshing.value = true;
  haptics.confirm();
  void settleTo(1);
  try {
    await props.refresh();
  } catch (error) {
    emit("error", error);
  } finally {
    await settleTo(0);
    refreshing.value = false;
  }
}

usePullGesture({
  scroller,
  enabled: () => !props.disabled && !refreshing.value,
  onPull(distance) {
    animation?.stop();
    if (fraction.value === 0) measureTop();
    fraction.value = pullFraction(distance);
    const armed = pullArmed(distance);
    if (armed !== wasArmed) {
      wasArmed = armed;
      haptics.tick();
    }
  },
  onRelease(distance) {
    wasArmed = false;
    if (pullArmed(distance)) void run();
    else void settleTo(0);
  },
});

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <div ref="anchor" class="m3-pull-to-refresh" :style="{ top: `${top}px` }" aria-hidden="false">
    <div
      v-show="visible"
      class="m3-pull-to-refresh__indicator"
      :style="{ transform: `translate3d(-50%, ${offset}px, 0) rotate(${rotation}deg)` }"
    >
      <M3LoadingIndicator v-if="refreshing" contained :label="props.label" />
      <M3LoadingIndicator v-else contained :progress="Math.min(1, fraction)" :label="props.label" />
    </div>
    <span class="m3-visually-hidden" aria-live="polite">{{ refreshing ? props.label : "" }}</span>
  </div>
</template>

<style scoped>
.m3-pull-to-refresh {
  position: sticky;
  z-index: 2;
  height: 0;
  overflow: visible;
  pointer-events: none;
}

.m3-pull-to-refresh__indicator {
  position: absolute;
  top: 0;
  left: 50%;
  border-radius: 50%;
  box-shadow: var(--md-sys-elevation-level2);
  will-change: transform;
}
</style>
