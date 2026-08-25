<template>
  <f7-page>
    <f7-navbar :title="t('settings.title')" large transparent :sliding="true" />

    <f7-block-title>{{ t("settings.locale") }}</f7-block-title>
    <f7-list strong-ios outline-ios dividers-ios>
      <f7-list-item
        v-for="option in locales"
        :key="option"
        radio
        :value="option"
        :checked="locale === option"
        :title="option.toUpperCase()"
        name="locale"
        @change="locale = option"
      />
    </f7-list>

    <f7-block-title>{{ t("settings.queryMetrics") }}</f7-block-title>
    <f7-list dividers-ios strong-ios outline-ios>
      <f7-list-item :title="t('metrics.totalQueries')" :after="String(totalQueries)" />
      <f7-list-item :title="t('metrics.avgQueryTime')" :after="`${avgQueryTime.toFixed(1)} ms`" />
      <f7-list-item :title="t('metrics.cacheHitRate')" :after="`${cacheHitRate.toFixed(0)} %`" />
      <f7-list-item :title="t('metrics.activeListeners')" :after="String(activeListeners)" />
    </f7-list>

    <f7-block-title>{{ t("settings.slowest") }}</f7-block-title>
    <f7-list v-if="slowestQueries.length" dividers-ios strong-ios outline-ios>
      <f7-list-item
        v-for="entry in slowestQueries"
        :key="entry.key"
        :title="entry.key"
        :after="`${entry.avgTime.toFixed(1)} ms`"
      />
    </f7-list>
    <f7-block v-else strong inset class="rounded-2xl!">
      <p class="m-0 text-sm opacity-60">{{ t("settings.noQueries") }}</p>
    </f7-block>

    <f7-block>
      <f7-button large @click="reset">{{ t("settings.resetMetrics") }}</f7-button>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { useQueryMetrics } from "@/shared/database/queries";

const { t, locale, availableLocales } = useI18n();
const locales = availableLocales;

const { totalQueries, avgQueryTime, cacheHitRate, activeListeners, slowestQueries, reset } =
  useQueryMetrics();
</script>
