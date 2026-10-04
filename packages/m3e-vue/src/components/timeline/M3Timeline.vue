<script setup lang="ts">
/**
 * Framework7's timeline for what happened, in order: an order's journey, a patient's visits, a
 * ticket's history. A list of `M3TimelineItem`s joined by a line that fills with `primary` up to the
 * current step. Name it with `label`.
 */
const props = defineProps<{ label: string }>();
</script>

<template>
  <ol class="m3-timeline" :aria-label="props.label">
    <slot />
  </ol>
</template>

<style scoped>
.m3-timeline {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
