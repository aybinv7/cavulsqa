<template>
  <GalleryBlock :title="t('gallery.inputs.tags')" :note="t('gallery.inputs.tagsNote')" stack>
    <M3ChipField
      v-model="tags"
      :label="t('gallery.inputs.tagsLabel')"
      :placeholder="t('gallery.inputs.tagsPlaceholder')"
      :supporting="t('gallery.inputs.tagsHint')"
      :max="MAX"
      :validate="valid"
      :remove-label="(tag: string) => t('gallery.inputs.removeTag', { tag })"
    />
    <div
      v-if="suggestions.length"
      class="flex flex-wrap gap-2"
      role="group"
      :aria-label="t('gallery.inputs.suggested')"
    >
      <M3Chip
        v-for="suggestion in suggestions"
        :key="suggestion"
        kind="suggestion"
        :label="suggestion"
        @click="add(suggestion)"
      />
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import { hasEntry } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const MAX = 6;

const { t } = useI18n();
const tags = ref<string[]>(["Wholesale", "Oran"]);
const SUGGESTED = computed(() =>
  ["nightDelivery", "pharmacy", "cashOnly", "keyAccount"].map((key) =>
    t(`gallery.inputs.suggestedTags.${key}`),
  ),
);
const suggestions = computed(() =>
  tags.value.length >= MAX ? [] : SUGGESTED.value.filter((tag) => !hasEntry(tags.value, tag)),
);

function valid(value: string) {
  return value.length >= 2 && value.length <= 24;
}

function add(tag: string) {
  if (tags.value.length < MAX && !hasEntry(tags.value, tag)) tags.value = [...tags.value, tag];
}
</script>
