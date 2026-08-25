<template>
  <f7-page>
    <f7-navbar :title="t('demo.title')" large transparent :sliding="true" />

    <f7-block class="text-sm opacity-70">{{ t("demo.intro") }}</f7-block>

    <DemoWriteControls :writing="writing" @add-one="addOne" @add-many="addMany" @clear="clearAll" />

    <f7-block-title>
      {{ t("demo.list", { count: noteCount }) }}
      <span v-if="loading" class="ml-2 text-xs opacity-60">{{ t("demo.refetching") }}</span>
      <span v-else-if="isStale" class="ml-2 text-xs opacity-60">{{ t("demo.stale") }}</span>
    </f7-block-title>

    <f7-block v-if="error" strong inset class="rounded-2xl!">
      <p class="m-0 text-red-600">{{ error.message }}</p>
    </f7-block>

    <f7-list v-else-if="notes.length" dividers-ios strong-ios outline-ios media-list>
      <f7-list-item
        v-for="note in notes"
        :key="note.id"
        :title="note.title"
        :footer="note.body"
        :after="String(note.id)"
      />
    </f7-list>

    <f7-block v-else strong inset class="rounded-2xl!">
      <p class="m-0 text-sm opacity-60">{{ t("demo.empty") }}</p>
    </f7-block>

    <DemoBusLog :entries="busLog" />

    <DemoPipelineBenchmark
      :result="pipeline"
      :measuring="measuring"
      :reads-per-run="readsPerRun"
      @measure="measurePipelining"
    />

    <f7-block-title>{{ t("demo.metrics") }}</f7-block-title>
    <f7-list dividers-ios strong-ios outline-ios>
      <f7-list-item
        :title="t('metrics.totalQueries')"
        :after="String(metrics.totalQueries.value)"
      />
      <f7-list-item
        :title="t('metrics.avgQueryTime')"
        :after="`${metrics.avgQueryTime.value.toFixed(1)} ms`"
      />
      <f7-list-item
        :title="t('metrics.activeListeners')"
        :after="String(metrics.activeListeners.value)"
      />
      <f7-list-item
        v-for="[table, count] in refetches"
        :key="table"
        :title="t('metrics.refetches', { table })"
        :after="String(count)"
      />
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import DemoWriteControls from "@/modules/demo/components/DemoWriteControls.vue";
import DemoBusLog from "@/modules/demo/components/DemoBusLog.vue";
import DemoPipelineBenchmark from "@/modules/demo/components/DemoPipelineBenchmark.vue";
import { useReactiveDemo } from "@/modules/demo/composables/useReactiveDemo";

const { t } = useI18n();

const {
  notes,
  noteCount,
  loading,
  isStale,
  error,
  writing,
  busLog,
  pipeline,
  measuring,
  metrics,
  addOne,
  addMany,
  clearAll,
  measurePipelining,
  readsPerRun,
} = useReactiveDemo();

const refetches = computed(() => Object.entries(metrics.refetchesByTable.value));
</script>
