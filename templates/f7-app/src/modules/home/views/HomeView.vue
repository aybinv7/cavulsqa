<template>
  <f7-page>
    <f7-navbar :title="t('home.title')" large transparent :sliding="true" />

    <f7-block class="text-sm opacity-70">{{ t("home.intro") }}</f7-block>

    <f7-block-title>{{ t("home.included") }}</f7-block-title>
    <f7-list dividers-ios strong-ios outline-ios media-list>
      <FeatureItem v-for="feature in templateFeatures" :key="feature.title" :feature="feature" />
    </f7-list>

    <f7-block-title>{{ t("home.next") }}</f7-block-title>
    <f7-list strong-ios outline-ios dividers-ios>
      <f7-list-button :title="t('home.openDemo')" @click="openDemo" />
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import FeatureItem from "@/modules/home/components/FeatureItem.vue";
import { templateFeatures } from "@/modules/home/composables/useTemplateFeatures";

const { t } = useI18n();

function openDemo() {
  // Each tab owns a view, so switching tab is a shell concern rather than a router push.
  f7.tab.show("#view-demo");
}
</script>
