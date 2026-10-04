<template>
  <section class="mx-4 flex flex-col gap-4 rounded-lg bg-surface-container-low p-4">
    <header class="flex flex-col gap-1">
      <h3 class="type-title-medium-emphasized m-0">{{ t("bench.title") }}</h3>
      <p class="type-body-small m-0 text-on-surface-variant">{{ t("bench.intro") }}</p>
    </header>

    <div class="flex flex-wrap gap-2">
      <M3Chip :label="engineName">
        <template #icon><i-ms-database-outline-rounded /></template>
      </M3Chip>
      <M3Chip v-if="baseline" :label="t('bench.against', { engine: baseline.engine })" />
      <M3Chip :label="t('bench.pragmas', { profile })" />
    </div>

    <M3Button :disabled="running" size="m" @click="run">
      <template #icon><i-ms-speed-rounded /></template>
      {{ running ? t("bench.running") : t("bench.run") }}
    </M3Button>

    <div v-if="running" class="flex flex-col gap-2">
      <M3LinearProgress :label="t('bench.running')" />
      <span v-if="progress" class="type-body-small text-on-surface-variant">{{ progress }}</span>
    </div>

    <p
      v-if="failure"
      class="type-body-medium m-0 rounded-md bg-error-container p-3 text-on-error-container"
      role="alert"
    >
      {{ failure }}
    </p>

    <div v-if="result" class="grid grid-cols-3 gap-0.5 overflow-hidden rounded-md text-center">
      <div class="flex flex-col gap-1 bg-surface-container p-3">
        <span class="type-label-medium text-on-surface-variant">{{ t("bench.cases") }}</span>
        <span class="type-title-medium tabular-nums">{{ result.cases.length }}</span>
      </div>
      <div class="flex flex-col gap-1 bg-surface-container p-3">
        <span class="type-label-medium text-on-surface-variant">{{ t("bench.rows") }}</span>
        <span class="type-title-medium tabular-nums">{{ result.rowsSeeded }}</span>
      </div>
      <div class="flex flex-col gap-1 bg-surface-container p-3">
        <span class="type-label-medium text-on-surface-variant">{{ t("bench.wall") }}</span>
        <span class="type-title-medium tabular-nums">{{ Math.round(result.totalMs) }} ms</span>
      </div>
    </div>
  </section>

  <template v-for="group in groups" :key="group">
    <template v-if="byGroup(group).length">
      <SectionHeader :title="t(`bench.group.${group}`)" />
      <M3List variant="segmented" inset>
        <M3ListItem
          v-for="entry in byGroup(group)"
          :key="entry.name"
          :headline="entry.name"
          :supporting="`${entry.current.operations} ops · p50 ${entry.current.medianMs} ms · ${t('bench.worst')} ${entry.current.worstMs} ms`"
          :trailing-text="`${entry.current.msPerOperation} ms`"
          :overline="entry.speedup ? speedupText(entry.speedup) : entry.note"
        >
          <template v-if="entry.speedup" #leading>
            <M3Shape
              :shape="entry.speedup >= 1 ? 'sunny' : 'square'"
              class="size-8"
              :class="verdictClass(entry.speedup)"
            />
          </template>
        </M3ListItem>
      </M3List>
    </template>
  </template>

  <div v-if="result" class="flex gap-2 px-4 pt-4">
    <M3Button variant="outlined" class="flex-1" @click="copy">{{ t("bench.copy") }}</M3Button>
    <M3Button variant="text" class="flex-1 text-error" @click="clear">{{
      t("bench.clear")
    }}</M3Button>
  </div>
</template>

<script setup lang="ts">
import { pragmaProfile } from "@/app/pragmas.config";
import { useBenchmark, type CaseComparison } from "@/modules/demo/composables/useBenchmark";

const { t } = useI18n();
const snackbar = useSnackbar();
const { engineName, running, progress, failure, result, baseline, comparison, run, clear, asJson } =
  useBenchmark();

const profile = pragmaProfile;
const groups = ["read", "join", "write", "transaction", "schema", "concurrency", "sync"] as const;

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
  if (speedup >= 1.2) return "bg-success-container";
  if (speedup <= 0.83) return "bg-error-container";
  return "bg-surface-container-highest";
}

async function copy() {
  try {
    await navigator.clipboard.writeText(asJson());
    void snackbar.show(t("bench.copied"));
  } catch {
    void snackbar.show({ message: t("bench.copyFailed"), duration: "long" });
  }
}
</script>
