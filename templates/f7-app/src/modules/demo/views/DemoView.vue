<template>
  <F7Page>
    <F7Navbar :title="t('demo.title')" large transparent :sliding="true">
      <F7NavRight>
        <F7Link icon-f7="chart_bar_alt_fill" panel-open="right" />
      </F7NavRight>
    </F7Navbar>

    <F7Block class="text-sm opacity-70">{{ t("demo.intro") }}</F7Block>

    <DemoWriteControls :writing="writing" @add-one="addOne" @add-many="addMany" @clear="clearAll" />

    <F7BlockTitle>
      {{ t("demo.list", { count: noteCount }) }}
      <span v-if="loading" class="ml-2 text-xs opacity-60">{{ t("demo.refetching") }}</span>
      <span v-else-if="isStale" class="ml-2 text-xs opacity-60">{{ t("demo.stale") }}</span>
    </F7BlockTitle>

    <F7Block v-if="error" strong inset class="rounded-2xl!">
      <p class="m-0 text-red-600">{{ error.message }}</p>
    </F7Block>

    <F7List v-else-if="notes.length" dividers-ios strong-ios outline-ios media-list>
      <F7ListItem
        v-for="note in notes"
        :key="note.id"
        :title="note.title"
        :footer="note.body"
        :after="String(note.id)"
      />
    </F7List>

    <F7Block v-else strong inset class="rounded-2xl!">
      <p class="m-0 text-sm opacity-60">{{ t("demo.empty") }}</p>
    </F7Block>

    <DemoBusLog :entries="busLog" />

    <DemoPipelineBenchmark
      :result="pipeline"
      :measuring="measuring"
      :reads-per-run="readsPerRun"
      :is-native="isNative"
      :platform="platform"
      @measure="measurePipelining"
    />
  </F7Page>
</template>

<script setup lang="ts">
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
  addOne,
  addMany,
  clearAll,
  measurePipelining,
  readsPerRun,
  isNative,
  platform,
} = useReactiveDemo();
</script>
