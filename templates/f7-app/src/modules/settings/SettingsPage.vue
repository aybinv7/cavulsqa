<template>
  <f7-page>
    <f7-navbar :title="t('settings.title')" large />

    <f7-list dividers-ios strong-ios outline-ios>
      <f7-list-item :title="t('settings.queries')" :after="String(totalQueries)" />
      <f7-list-item :title="t('settings.avgTime')" :after="`${avgQueryTime.toFixed(1)} ms`" />
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useQueryMetrics } from "@/shared/database";

const { t } = useI18n();

// The same recorder the reactive queries write to, so this reflects real traffic rather than a
// separate count.
const { totalQueries, avgQueryTime } = useQueryMetrics();
</script>
