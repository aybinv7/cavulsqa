<template>
  <AppPage :title="t('gallery.title')" name="gallery">
    <p class="type-body-large m-0 px-6 pb-2 text-on-surface-variant">{{ t("gallery.intro") }}</p>
    <M3List variant="segmented" inset :label="t('gallery.title')">
      <M3ListItem
        v-for="entry in entries"
        :key="entry.id"
        clickable
        :headline="t(entry.titleKey)"
        :supporting="t(entry.subtitleKey)"
        @click="f7router.navigate(entry.path ?? `/gallery/${entry.id}/`)"
      >
        <template #leading>
          <M3Shape :shape="entry.shape" class="size-10" :class="TONE_CLASSES[entry.tone]">
            <component :is="entry.icon" class="size-5" />
          </M3Shape>
        </template>
        <template #trailing><i-ms-chevron-right-rounded class="rtl:-scale-x-100" /></template>
      </M3ListItem>
    </M3List>
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import {
  CONTACTS_SECTION,
  TABS_SECTION,
  sections,
} from "@/modules/gallery/composables/useGallerySections";
import { TONE_CLASSES } from "@/shared/utils/tone";

defineProps<{ f7router: Router.Router }>();
const { t } = useI18n();
const entries = [
  ...sections.slice(0, 5),
  TABS_SECTION,
  ...sections.slice(5, 9),
  CONTACTS_SECTION,
  ...sections.slice(9),
];
</script>
