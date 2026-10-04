<template>
  <M3BottomSheet v-model:open="open" :title="t('metrics.title')">
    <div class="grid grid-cols-2 gap-2 px-4">
      <div
        v-for="tile in tiles"
        :key="tile.labelKey"
        class="flex flex-col gap-1 rounded-lg bg-surface-container p-4"
      >
        <span class="type-label-medium text-on-surface-variant">{{ t(tile.labelKey) }}</span>
        <span class="type-title-large-emphasized tabular-nums">{{ tile.value }}</span>
      </div>
    </div>

    <SectionHeader :title="t('metrics.refetchesTitle')" />
    <M3List v-if="refetches.length" variant="segmented" inset>
      <M3ListItem
        v-for="[table, count] in refetches"
        :key="table"
        :headline="table"
        :trailing-text="String(count)"
      >
        <template #leading><i-ms-sync-rounded /></template>
      </M3ListItem>
    </M3List>
    <p v-else class="type-body-medium m-0 px-6 text-on-surface-variant">
      {{ t("metrics.noRefetches") }}
    </p>

    <SectionHeader :title="t('metrics.slowest')" />
    <M3List v-if="slowestQueries.length" variant="segmented" inset>
      <M3ListItem
        v-for="entry in slowestQueries"
        :key="entry.key"
        :headline="`${entry.avgTime.toFixed(1)} ms`"
        :supporting="entry.key"
        :trailing-text="t('metrics.calls', { count: entry.count }, entry.count)"
        multiline
      >
        <template #leading><i-ms-speed-rounded /></template>
      </M3ListItem>
    </M3List>
    <p v-else class="type-body-medium m-0 px-6 text-on-surface-variant">
      {{ t("metrics.noQueries") }}
    </p>

    <template #footer>
      <M3Button variant="outlined" class="w-full" @click="reset">{{ t("metrics.reset") }}</M3Button>
    </template>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { useQueryMetrics } from "@/shared/database/queries";

/** The query metrics, in a sheet over whichever screen asked - the numbers belong to no one page. */
const open = defineModel<boolean>("open", { default: false });
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
const tiles = computed(() => [
  { labelKey: "metrics.totalQueries", value: String(totalQueries.value) },
  { labelKey: "metrics.avgQueryTime", value: `${avgQueryTime.value.toFixed(1)} ms` },
  { labelKey: "metrics.cacheHitRate", value: `${cacheHitRate.value.toFixed(0)} %` },
  { labelKey: "metrics.activeListeners", value: String(activeListeners.value) },
]);
</script>
