<template>
  <F7Page>
    <F7Navbar :title="t('home.title')" large transparent :sliding="true">
      <F7NavRight>
        <F7Link icon-f7="chart_bar_alt_fill" panel-open="right" />
      </F7NavRight>
    </F7Navbar>

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
        :key="feature.titleKey"
        :title="t(feature.titleKey)"
        :subtitle="t(feature.subtitleKey)"
      >
        <template #media>
          <F7Icon :f7="feature.icon" :color="feature.color" />
        </template>
        <template #text>{{ t(feature.textKey) }}</template>
      </F7ListItem>
    </F7List>

    <F7BlockTitle>{{ t("home.demos") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem
        :title="t('home.openDemo')"
        :subtitle="t('home.openDemoSubtitle')"
        :after="t('home.tryIt')"
        link="#"
        @click="showDemo"
      >
        <template #media><F7Icon f7="bolt_fill" color="yellow" /></template>
      </F7ListItem>
      <F7ListItem
        :title="t('home.openMetrics')"
        :subtitle="t('home.openMetricsSubtitle')"
        panel-open="right"
        link="#"
      >
        <template #media><F7Icon f7="chart_bar_alt_fill" color="blue" /></template>
      </F7ListItem>
    </F7List>

    <F7Block class="text-center">
      <p class="m-0 text-sm opacity-50">{{ t("home.startBuilding") }}</p>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import { features } from "@/modules/home/composables/useHomeFeatures";

const { t } = useI18n();
const appName = __APP_NAME__;

function showDemo() {
  // Each tab owns a view, so moving between sections is a shell concern, not a router push.
  f7.tab.show("#view-demo");
}
</script>
