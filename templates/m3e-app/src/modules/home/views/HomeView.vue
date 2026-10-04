<template>
  <AppPage :title="t('home.title')" name="home">
    <template #actions>
      <M3IconButton :label="t('home.studio')" @click="openStudio">
        <i-ms-palette-outline-rounded />
      </M3IconButton>
    </template>

    <HomeHero @explore="tabs.show('gallery')" @personalise="openStudio" />

    <SectionHeader :title="t('home.included')" />
    <M3List variant="segmented" inset :label="t('home.included')">
      <M3ListItem
        v-for="feature in features"
        :key="feature.id"
        clickable
        :headline="t(feature.titleKey)"
        :supporting="t(feature.subtitleKey)"
        @click="openFeature(feature, $event)"
      >
        <template #leading>
          <M3Shape :shape="feature.shape" class="size-10" :class="TONE_CLASSES[feature.tone]">
            <component :is="feature.icon" class="size-5" />
          </M3Shape>
        </template>
        <template #trailing><i-ms-chevron-right-rounded class="rtl:-scale-x-100" /></template>
      </M3ListItem>
    </M3List>
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import HomeHero from "@/modules/home/components/HomeHero.vue";
import { features, type HomeFeature } from "@/modules/home/composables/useHomeFeatures";
import { TONE_CLASSES } from "@/shared/utils/tone";

const { t } = useI18n();
const props = defineProps<{ f7router: Router.Router }>();
const tabs = useActiveTab();
const { open } = useContainerTransform();

function openFeature(feature: HomeFeature, event: MouseEvent) {
  open(props.f7router, event, `/home/feature/${feature.id}/`);
}

function openStudio() {
  tabs.open("settings", "/settings/studio/");
}
</script>
