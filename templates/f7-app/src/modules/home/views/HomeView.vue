<template>
  <F7Page>
    <F7Navbar :title="t('home.title')" large transparent :sliding="true" />

    <F7BlockTitle>{{ t("home.welcome") }}</F7BlockTitle>
    <F7Block strong inset class="rounded-2xl!">
      <p class="m-0">
        <strong>{{ appName }}</strong> {{ t("home.intro") }}
      </p>
    </F7Block>

    <F7BlockTitle>{{ t("home.included") }}</F7BlockTitle>
    <F7List media-list strong inset dividers class="rounded-2xl!">
      <F7ListItem
        v-for="feature in features"
        :key="feature.id"
        :title="t(feature.titleKey)"
        :subtitle="t(feature.subtitleKey)"
        :after="feature.transition.replace('f7-', '')"
        link="#"
        @click="openFeature(feature)"
      >
        <template #media>
          <F7Icon :f7="feature.icon" :color="feature.color" />
        </template>
        <template #text>{{ t(feature.textKey) }}</template>
      </F7ListItem>
    </F7List>

    <F7Block class="text-center">
      <p class="m-0 text-sm opacity-50">{{ t("home.tapAny") }}</p>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { features, type HomeFeature } from "@/modules/home/composables/useHomeFeatures";

const { t } = useI18n();
const appName = __APP_NAME__;

// This view's own router, so the push stays inside the Home tab.
const props = defineProps<{ f7router: Router.Router }>();

/**
 * Navigating programmatically rather than through a `link` href, because each row carries its own
 * transition. `f7router` is this view's router, so the push stays inside the Home tab.
 */
function openFeature(feature: HomeFeature) {
  props.f7router.navigate(`/home/feature/${feature.id}/`, { transition: feature.transition });
}
</script>
