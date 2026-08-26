<template>
  <F7BlockTitle>{{ t("bench.title") }}</F7BlockTitle>
  <F7Block strong inset class="rounded-2xl!">
    <p class="mt-0 text-sm opacity-70">{{ t("bench.intro") }}</p>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <F7Chip :text="engineName" color="teal" outline />
      <F7Chip v-if="baseline" :text="t('bench.against', { engine: baseline.engine })" outline />
    </div>

    <F7Button fill :disabled="running" @click="run">
      {{ running ? t("bench.running") : t("bench.run") }}
    </F7Button>

    <p v-if="running && progress" class="mb-0 mt-2 text-center text-xs opacity-60">
      {{ progress }}
    </p>

    <p v-if="failure" class="text-color-red mb-0 mt-2 text-xs">{{ failure }}</p>

    <div v-if="result" class="mt-3 grid grid-cols-3 gap-2 text-center">
      <div>
        <div class="text-xs opacity-60">{{ t("bench.cases") }}</div>
        <div class="font-mono text-base">{{ result.cases.length }}</div>
      </div>
      <div>
        <div class="text-xs opacity-60">{{ t("bench.rows") }}</div>
        <div class="font-mono text-base">{{ result.rowsSeeded }}</div>
      </div>
      <div>
        <div class="text-xs opacity-60">{{ t("bench.wall") }}</div>
        <div class="font-mono text-base">{{ Math.round(result.totalMs) }} ms</div>
      </div>
    </div>
  </F7Block>

  <template v-for="group in groups" :key="group">
    <template v-if="byGroup(group).length">
      <F7BlockTitle>{{ t(`bench.group.${group}`) }}</F7BlockTitle>
      <F7List media-list strong inset dividers class="rounded-2xl!">
        <F7ListItem v-for="entry in byGroup(group)" :key="entry.name" :title="entry.name">
          <template #after>
            <span class="font-mono text-sm tabular-nums">
              {{ entry.current.msPerOperation }} ms
            </span>
          </template>
          <template #subtitle>
            <span class="text-[13px] tabular-nums opacity-60">
              {{ entry.current.operations }} ops &middot; p50 {{ entry.current.medianMs }} ms
              &middot; {{ t("bench.worst") }} {{ entry.current.worstMs }} ms
            </span>
          </template>
          <template #text>
            <span v-if="entry.speedup" class="text-[13px]" :class="verdictClass(entry.speedup)">
              {{ speedupText(entry.speedup) }}
              <span class="opacity-55">({{ entry.other?.msPerOperation }} ms)</span>
            </span>
            <span v-else-if="entry.note" class="text-[13px] opacity-55">{{ entry.note }}</span>
          </template>
        </F7ListItem>
      </F7List>
    </template>
  </template>

  <F7Block v-if="result" class="flex gap-2">
    <F7Button outline small class="flex-1" @click="copy">{{ t("bench.copy") }}</F7Button>
    <F7Button outline small color="red" class="flex-1" @click="clear">
      {{ t("bench.clear") }}
    </F7Button>
  </F7Block>
</template>

<script setup lang="ts">
import { useBenchmark, type CaseComparison } from "@/modules/demo/composables/useBenchmark";

const { t } = useI18n();
const { engineName, running, progress, failure, result, baseline, comparison, run, clear, asJson } =
  useBenchmark();

const groups = ["write", "read", "transaction", "concurrency"] as const;

function byGroup(group: CaseComparison["group"]): CaseComparison[] {
  return comparison.value.filter((entry) => entry.group === group);
}

/** Both directions read plainly; "0.4x faster" would not. */
function speedupText(speedup: number): string {
  return speedup >= 1
    ? t("bench.faster", { times: speedup.toFixed(2) })
    : t("bench.slower", { times: (1 / speedup).toFixed(2) });
}

function verdictClass(speedup: number): string {
  if (speedup >= 1.2) return "text-color-green";
  if (speedup <= 0.83) return "text-color-red";
  return "opacity-55";
}

async function copy() {
  try {
    await navigator.clipboard.writeText(asJson());
    f7.toast.create({ text: t("bench.copied"), position: "center", closeTimeout: 1500 }).open();
  } catch {
    f7.dialog.alert(t("bench.copyFailed"), t("bench.title"));
  }
}
</script>
