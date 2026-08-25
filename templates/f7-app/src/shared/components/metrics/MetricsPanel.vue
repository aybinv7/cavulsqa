<template>
  <F7Page>
    <F7Navbar :title="t('metrics.title')">
      <F7NavRight>
        <F7Link panel-close icon-f7="xmark" />
      </F7NavRight>
    </F7Navbar>

    <F7BlockTitle>{{ t("metrics.summary") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem :title="t('metrics.totalQueries')" :after="String(totalQueries)">
        <template #media><F7Icon f7="number_circle_fill" color="blue" /></template>
      </F7ListItem>
      <F7ListItem :title="t('metrics.avgQueryTime')" :after="`${avgQueryTime.toFixed(1)} ms`">
        <template #media><F7Icon f7="timer_fill" color="orange" /></template>
      </F7ListItem>
      <F7ListItem :title="t('metrics.cacheHitRate')" :after="`${cacheHitRate.toFixed(0)} %`">
        <template #media><F7Icon f7="bolt_circle_fill" color="green" /></template>
      </F7ListItem>
      <F7ListItem :title="t('metrics.activeListeners')" :after="String(activeListeners)">
        <template #media><F7Icon f7="antenna_radiowaves_left_right" color="purple" /></template>
      </F7ListItem>
    </F7List>

    <F7BlockTitle>{{ t("metrics.refetchesTitle") }}</F7BlockTitle>
    <F7List v-if="refetches.length" strong inset dividers class="rounded-2xl!">
      <F7ListItem
        v-for="[table, count] in refetches"
        :key="table"
        :title="table"
        :after="String(count)"
      >
        <template #media><F7Icon f7="arrow_2_circlepath" color="teal" /></template>
      </F7ListItem>
    </F7List>
    <F7Block v-else strong inset class="rounded-2xl!">
      <p class="m-0 text-sm">{{ t("metrics.noRefetches") }}</p>
    </F7Block>

    <F7BlockTitle>{{ t("metrics.slowest") }}</F7BlockTitle>
    <!-- media-list, because a query key is long and the panel is narrow. -->
    <F7List v-if="slowestQueries.length" media-list strong inset dividers class="rounded-2xl!">
      <F7ListItem
        v-for="entry in slowestQueries"
        :key="entry.key"
        :title="`${entry.avgTime.toFixed(1)} ms`"
        :subtitle="t('metrics.calls', { count: entry.count })"
      >
        <template #media><F7Icon f7="speedometer" color="red" /></template>
        <template #text>{{ entry.key }}</template>
      </F7ListItem>
    </F7List>
    <F7Block v-else strong inset class="rounded-2xl!">
      <p class="m-0 text-sm">{{ t("metrics.noQueries") }}</p>
    </F7Block>

    <F7Block>
      <F7Button large outline @click="reset">{{ t("metrics.reset") }}</F7Button>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import { useQueryMetrics } from "@/shared/database/queries";

const { t } = useI18n();

const {
  totalQueries,
  avgQueryTime,
  cacheHitRate,
  activeListeners,
  refetchesByTable,
  slowestQueries,
  reset,
} = useQueryMetrics();

const refetches = computed(() => Object.entries(refetchesByTable.value));
</script>
