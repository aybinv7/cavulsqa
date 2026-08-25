<template>
  <f7-list-item :title="feature.title" :after="''">
    <template #media>
      <f7-icon :f7="feature.icon" class="text-[--f7-theme-color]" />
    </template>
    <template #footer>
      <span class="block leading-snug">{{ feature.description }}</span>
      <code class="mt-1 block text-[11px] opacity-60">{{ feature.source }}</code>
    </template>
  </f7-list-item>
</template>

<script setup lang="ts">
import type { TemplateFeature } from "@/modules/home/composables/useTemplateFeatures";

defineProps<{ feature: TemplateFeature }>();
</script>
