<script setup lang="ts">
import { materialShapeMask, type MaterialShapeName } from "@cavulsqa/m3e";
import { computed } from "vue";

/**
 * Cuts its content to one of the 35 Material shapes with a CSS mask, so photos, colour and icons
 * all take the shape at any size. Give it a square box.
 *
 * @see https://m3.material.io/styles/shape/overview-principles
 */
const props = defineProps<{ shape: MaterialShapeName }>();

const mask = computed(() => materialShapeMask(props.shape));
</script>

<template>
  <div class="m3-shape" :style="{ maskImage: mask, WebkitMaskImage: mask }">
    <slot />
  </div>
</template>

<style scoped>
.m3-shape {
  display: grid;
  place-items: center;
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
}
</style>
