<template>
  <section class="mx-4 flex flex-col gap-4 rounded-lg bg-surface-container-low p-4">
    <header class="flex flex-col gap-1">
      <h3 class="type-title-medium-emphasized m-0">{{ t("demo.pipelining") }}</h3>
      <p class="type-body-small m-0 text-on-surface-variant">
        {{
          isNative
            ? t("demo.pipeliningNative", { count: readsPerRun })
            : t("demo.pipeliningWeb", { count: readsPerRun })
        }}
      </p>
    </header>

    <div class="flex flex-wrap items-center gap-2">
      <M3Chip :label="engineName">
        <template #icon><i-ms-database-outline-rounded /></template>
      </M3Chip>
      <span class="type-body-small text-on-surface-variant">{{ t("demo.engineSwitch") }}</span>
    </div>

    <div class="flex items-center gap-3">
      <M3Button :disabled="measuring" @click="emit('measure')">
        <template #icon><i-ms-speed-rounded /></template>
        {{ measuring ? t("demo.measuring") : t("demo.measure") }}
      </M3Button>
      <M3LoadingIndicator v-if="measuring" :size="40" :label="t('demo.measuring')" />
    </div>

    <template v-if="result">
      <div class="grid grid-cols-3 gap-0.5 overflow-hidden rounded-md text-center">
        <div class="flex flex-col gap-1 bg-surface-container p-3">
          <span class="type-label-medium text-on-surface-variant">{{ t("demo.parallel") }}</span>
          <span class="type-title-medium tabular-nums">{{ result.parallelMs }} ms</span>
        </div>
        <div class="flex flex-col gap-1 bg-surface-container p-3">
          <span class="type-label-medium text-on-surface-variant">{{ t("demo.sequential") }}</span>
          <span class="type-title-medium tabular-nums">{{ result.sequentialMs }} ms</span>
        </div>
        <div class="flex flex-col gap-1 bg-primary-container p-3 text-on-primary-container">
          <span class="type-label-medium">{{ t("demo.ratio") }}</span>
          <span class="type-title-medium-emphasized tabular-nums">{{ result.ratio }}&times;</span>
        </div>
      </div>
      <p class="type-body-small m-0 text-on-surface-variant">
        {{ t("demo.measuredOn", { engine: result.engine }) }} ·
        {{ isNative ? t("demo.ratioNative") : t("demo.ratioWeb", { platform }) }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { PipelineResult } from "@/modules/demo/composables/useReactiveDemo";

defineProps<{
  result: PipelineResult | null;
  measuring: boolean;
  readsPerRun: number;
  isNative: boolean;
  platform: string;
  engineName: string;
}>();
const emit = defineEmits<{ measure: [] }>();
const { t } = useI18n();
</script>
