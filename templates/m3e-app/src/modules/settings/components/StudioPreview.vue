<template>
  <section
    class="mx-4 flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 text-on-surface shadow-1"
    :aria-label="t('studio.preview')"
  >
    <header class="flex items-center gap-3">
      <M3Shape shape="clover4Leaf" class="size-12 bg-tertiary-container text-on-tertiary-container">
        <i-ms-auto-awesome-outline-rounded class="size-6" />
      </M3Shape>
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="type-title-medium-emphasized">{{ t("studio.previewTitle") }}</span>
        <span class="type-body-medium text-on-surface-variant">{{ t("studio.previewText") }}</span>
      </div>
      <M3Switch v-model="on" :label="t('studio.previewSwitch')" />
    </header>

    <M3LinearProgress :value="0.62" :label="t('studio.previewProgress')" />

    <div class="flex flex-wrap items-center gap-2">
      <M3Chip
        kind="filter"
        :label="t('studio.previewChip')"
        :selected="on"
        @update:selected="on = $event"
      />
      <M3Chip :label="t('studio.previewAssist')">
        <template #icon><i-ms-bolt-rounded /></template>
      </M3Chip>
    </div>

    <div class="flex items-center gap-2">
      <M3ButtonGroup size="s" :label="t('studio.preview')">
        <M3Button>{{ t("studio.previewPrimary") }}</M3Button>
        <M3Button variant="tonal">{{ t("studio.previewTonal") }}</M3Button>
      </M3ButtonGroup>
      <span class="flex-1" />
      <M3LoadingIndicator contained :size="40" :label="t('studio.previewLoading')" />
      <M3Fab size="small" :label="t('studio.previewFab')" color="tertiary-container">
        <i-ms-add-rounded />
      </M3Fab>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * A handful of live components in the generated scheme, so a seed or variant change is judged on
 * real surfaces - containers, an active wave, a selected chip - rather than on swatches alone.
 */
const { t } = useI18n();
const on = ref(true);
</script>
