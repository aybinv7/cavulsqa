<template>
  <GalleryBlock
    :title="t('gallery.surfaces.containerTransform')"
    :note="t('gallery.surfaces.containerTransformNote')"
    stack
  >
    <div ref="grid" class="grid grid-cols-2 gap-3">
      <M3Card
        v-for="(story, index) in featuredStories"
        :key="story.id"
        variant="filled"
        clickable
        :class="[TONE_CLASSES[story.tone], index === 0 && 'col-span-2']"
        @click="openStory(story, $event)"
      >
        <div class="flex h-full flex-col gap-3 p-4" :class="index === 0 && 'min-h-36'">
          <M3Shape :shape="story.shape" class="size-12 bg-surface/60">
            <component :is="story.icon" class="size-6" />
          </M3Shape>
          <span class="mt-auto flex flex-col gap-1">
            <span class="type-title-medium">{{ t(`gallery.featured.${story.id}.title`) }}</span>
            <span class="type-body-medium opacity-80">{{
              t(`gallery.featured.${story.id}.text`)
            }}</span>
          </span>
        </div>
      </M3Card>
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import { featuredStories, type FeaturedStory } from "@/modules/gallery/composables/featuredStories";
import { TONE_CLASSES } from "@/shared/utils/tone";

const { t } = useI18n();
const grid = useTemplateRef<HTMLElement>("grid");
const { router } = useViewRouter(grid);
const { open } = useContainerTransform();

function openStory(story: FeaturedStory, event: MouseEvent) {
  const current = router();
  if (current) open(current, event, `/gallery/featured/${story.id}/`);
}
</script>
