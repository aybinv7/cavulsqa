<template>
  <AppPage
    :title="story ? t(`gallery.featured.${story.id}.title`) : t('errors.notFoundTitle')"
    variant="small"
    back
  >
    <template v-if="story">
      <section
        class="mx-4 flex flex-col gap-4 rounded-xl p-6"
        :class="TONE_CLASSES[story.tone]"
        :aria-label="t(`gallery.featured.${story.id}.title`)"
      >
        <M3Shape :shape="story.shape" class="size-20 bg-surface/60">
          <component :is="story.icon" class="size-10" />
        </M3Shape>
        <h2 class="type-headline-small m-0">{{ t(`gallery.featured.${story.id}.title`) }}</h2>
        <p class="type-body-large m-0 opacity-80">{{ t(`gallery.featured.${story.id}.text`) }}</p>
      </section>

      <p class="type-body-large m-0 px-6 pt-6 text-on-surface">
        {{ t(`gallery.featured.${story.id}.body`) }}
      </p>

      <SectionHeader :title="t('gallery.featured.glance')" />
      <M3List variant="segmented" inset :label="t('gallery.featured.glance')">
        <M3ListItem
          v-for="fact in story.facts"
          :key="fact.id"
          :headline="t(`gallery.featured.${story.id}.facts.${fact.id}`)"
          :trailing-text="number.format(fact.value)"
        >
          <template #leading><component :is="fact.icon" /></template>
        </M3ListItem>
      </M3List>

      <p class="type-body-small m-0 px-8 pt-4 text-on-surface-variant">
        {{ t("gallery.featured.note") }}
      </p>
    </template>

    <EmptyState
      v-else
      shape="ghostish"
      :headline="t('errors.notFoundTitle')"
      :text="t('errors.notFound')"
    />
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { findStory } from "@/modules/gallery/composables/featuredStories";
import { TONE_CLASSES } from "@/shared/utils/tone";

const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();
const { t, locale } = useI18n();

const story = computed(() => findStory(String(props.f7route.params.id ?? "")));
const number = computed(() => new Intl.NumberFormat(locale.value));
</script>
