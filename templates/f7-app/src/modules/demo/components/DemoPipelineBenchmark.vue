<template>
  <F7BlockTitle>{{ t("demo.pipelining") }}</F7BlockTitle>
  <F7Block strong inset class="rounded-2xl!">
    <p class="mt-0 text-sm opacity-70">
      {{
        isNative
          ? t("demo.pipeliningNative", { count: readsPerRun })
          : t("demo.pipeliningWeb", { count: readsPerRun })
      }}
    </p>

    <F7Button fill :disabled="measuring" @click="$emit('measure')">
      {{ measuring ? t("demo.measuring") : t("demo.measure") }}
    </F7Button>

    <div v-if="result" class="mt-3">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div>
          <div class="text-xs opacity-60">{{ t("demo.parallel") }}</div>
          <div class="font-mono text-base">{{ result.parallelMs }} ms</div>
        </div>
        <div>
          <div class="text-xs opacity-60">{{ t("demo.sequential") }}</div>
          <div class="font-mono text-base">{{ result.sequentialMs }} ms</div>
        </div>
        <div>
          <div class="text-xs opacity-60">{{ t("demo.ratio") }}</div>
          <div class="font-mono text-base font-bold">{{ result.ratio }}&times;</div>
        </div>
      </div>

      <p class="mb-0 mt-3 text-xs opacity-70">
        {{ isNative ? t("demo.ratioNative") : t("demo.ratioWeb", { platform }) }}
      </p>
    </div>
  </F7Block>
</template>

<script setup lang="ts">
import type { PipelineResult } from "@/modules/demo/composables/useReactiveDemo";

defineProps<{
  result: PipelineResult | null;
  measuring: boolean;
  readsPerRun: number;
  isNative: boolean;
  platform: string;
}>();
defineEmits<{ measure: [] }>();

const { t } = useI18n();
</script>
