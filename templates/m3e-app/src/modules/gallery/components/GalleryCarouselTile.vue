<template>
  <button
    type="button"
    class="gallery-tile relative block size-full overflow-hidden text-start"
    :style="{
      background: `linear-gradient(135deg, var(--md-sys-color-${props.from}), var(--md-sys-color-${props.to}))`,
    }"
    :aria-label="props.title"
    @click="emit('select')"
  >
    <M3ShapeMorph
      :shape="props.shape"
      class="gallery-tile__shape absolute size-56 opacity-50"
      :style="{ color: `var(--md-sys-color-${props.to})` }"
    />
    <component
      :is="props.icon"
      class="gallery-tile__icon absolute left-1/2 top-1/2 size-16"
      :style="{ color: `var(--md-sys-color-on-${props.from})` }"
    />
    <span
      class="gallery-tile__label type-title-medium-emphasized absolute bottom-4 whitespace-nowrap"
      :style="{ color: `var(--md-sys-color-on-${props.from})` }"
      >{{ props.title }}</span
    >
  </button>
</template>

<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { Component } from "vue";

/**
 * A carousel tile drawn from the theme: a tonal gradient, a shape and an icon centred on the full
 * item so they parallax under the mask, and a label that slides with the mask's start edge and
 * fades as the item compresses - Compose's FadingMultiBrowse sample.
 */
const props = defineProps<{
  title: string;
  icon: Component;
  shape: MaterialShapeName;
  from: string;
  to: string;
}>();

const emit = defineEmits<{ select: [] }>();
</script>

<style scoped>
.gallery-tile {
  border: 0;
  padding: 0;
  cursor: pointer;
}

.gallery-tile__shape {
  right: -48px;
  top: -40px;
}

.gallery-tile__icon {
  translate: -50% -50%;
  opacity: 0.85;
}

.gallery-tile__label {
  left: 0;
  transform: translateX(calc(var(--m3-carousel-mask-start, 0px) + 16px));
  opacity: clamp(0, calc((var(--m3-carousel-item-progress, 1) - 0.55) * 3), 1);
}
</style>
