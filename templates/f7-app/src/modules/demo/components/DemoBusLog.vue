<template>
  <f7-block-title>{{ t("demo.bus") }}</f7-block-title>
  <f7-block strong inset class="rounded-2xl!">
    <p class="mt-0 text-sm opacity-70">{{ t("demo.busHint") }}</p>

    <ul v-if="entries.length" class="m-0 list-none p-0 font-mono text-xs">
      <li v-for="entry in entries" :key="entry.at" class="flex justify-between py-0.5">
        <span>{{ entry.table }}.{{ entry.type }}</span>
        <span class="opacity-60">{{ formatTime(entry.at) }}</span>
      </li>
    </ul>
    <p v-else class="text-sm opacity-60">{{ t("demo.busEmpty") }}</p>
  </f7-block>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { BusEntry } from "@/modules/demo/composables/useReactiveDemo";

defineProps<{ entries: BusEntry[] }>();

const { t } = useI18n();

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour12: false });
}
</script>
