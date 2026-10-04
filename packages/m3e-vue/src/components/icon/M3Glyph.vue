<script setup lang="ts">
import { GLYPHS, type GlyphName } from "./glyphs.js";

/** One of the package's own control glyphs, filled with `currentColor`, decorative by default. */
const props = withDefaults(defineProps<{ name: GlyphName; size?: number }>(), { size: 24 });
</script>

<template>
  <svg
    class="m3-glyph"
    viewBox="0 0 24 24"
    :width="props.size"
    :height="props.size"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="GLYPHS[props.name]" />
  </svg>
</template>

<style scoped>
.m3-glyph {
  flex: none;
  fill: currentColor;
}
</style>
