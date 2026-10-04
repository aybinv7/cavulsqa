<template>
  <section class="flex flex-col items-center gap-4 px-8 py-12 text-center">
    <M3Shape
      :shape="props.shape"
      class="size-24 bg-secondary-container text-on-secondary-container"
    >
      <slot name="icon" />
    </M3Shape>
    <h3 class="type-title-large m-0 text-on-surface">{{ props.headline }}</h3>
    <p v-if="props.text" class="type-body-medium m-0 max-w-80 text-on-surface-variant">
      {{ props.text }}
    </p>
    <slot />
  </section>
</template>

<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";

/**
 * What a screen shows when it has nothing to show: a shape, one line that explains, and the one
 * action that fills it. Never a paragraph, never placeholder rows.
 */
const props = withDefaults(
  defineProps<{ headline: string; text?: string; shape?: MaterialShapeName }>(),
  {
    shape: "cookie9Sided",
  },
);
</script>
