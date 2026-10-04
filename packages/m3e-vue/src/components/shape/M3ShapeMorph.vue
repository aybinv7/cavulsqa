<script setup lang="ts">
import {
  MOTION_SCHEMES,
  animateSpring,
  createShapeMorph,
  materialShapePath,
  type MaterialShapeName,
  type SpringAnimation,
} from "@cavulsqa/m3e";
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { useReducedMotion } from "../../composables/useReducedMotion.js";

/**
 * A Material shape that morphs into the next one whenever `shape` changes, on the expressive
 * default spatial spring - the overshoot is part of the look. Fills with `currentColor`; content in
 * the slot sits centred on top. Under reduced motion it swaps without travel.
 *
 * @see https://m3.material.io/styles/shape/shape-morph
 */
const props = withDefaults(defineProps<{ shape: MaterialShapeName; rotate?: number }>(), {
  rotate: 0,
});

const reduced = useReducedMotion();
const path = useTemplateRef<SVGPathElement>("path");
const initial = shallowRef(materialShapePath(props.shape));
let animation: SpringAnimation | null = null;

watch(
  () => props.shape,
  (next, previous) => {
    animation?.stop();
    if (!path.value || reduced.value) {
      initial.value = materialShapePath(next);
      path.value?.setAttribute("d", initial.value);
      return;
    }
    const morph = createShapeMorph(previous, next);
    const element = path.value;
    animation = animateSpring({
      from: 0,
      to: 1,
      spring: MOTION_SCHEMES.expressive.defaultSpatial.spring,
      restDelta: 0.001,
      onFrame: (value) => element.setAttribute("d", morph.at(value)),
    });
    void animation.finished.then((done) => {
      if (done) element.setAttribute("d", materialShapePath(next));
    });
  },
);

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <div class="m3-shape-morph">
    <svg viewBox="0 0 100 100" aria-hidden="true" :style="{ rotate: `${props.rotate}deg` }">
      <path ref="path" :d="initial" />
    </svg>
    <div class="m3-shape-morph__content"><slot /></div>
  </div>
</template>

<style scoped>
.m3-shape-morph {
  position: relative;
  display: grid;
  place-items: center;
}

svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: currentColor;
  overflow: visible;
  transition: rotate var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-shape-morph__content {
  position: relative;
  display: grid;
  place-items: center;
}
</style>
