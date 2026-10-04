<template>
  <section class="mx-4 mt-3 flex flex-col gap-4 rounded-lg bg-surface-container-low p-4 first:mt-1">
    <header class="flex flex-col gap-0.5">
      <h3 class="type-title-small-emphasized m-0 text-on-surface">{{ props.title }}</h3>
      <p v-if="props.note" class="type-body-small m-0 text-on-surface-variant">{{ props.note }}</p>
    </header>
    <div :class="props.stack ? 'flex flex-col gap-4' : 'flex flex-wrap items-center gap-3'">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
/** One demonstrated variant family: a title, the spec point it shows, and the live components. */
const props = defineProps<{ title: string; note?: string; stack?: boolean }>();
</script>
