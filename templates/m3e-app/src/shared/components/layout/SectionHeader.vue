<template>
  <h2 class="type-title-small-emphasized px-6 pt-6 pb-2 text-primary">
    <slot>{{ props.title }}</slot>
  </h2>
</template>

<script setup lang="ts">
/** The label above a group of content: M3's list subheader, in the primary role. */
const props = defineProps<{ title?: string }>();
</script>
