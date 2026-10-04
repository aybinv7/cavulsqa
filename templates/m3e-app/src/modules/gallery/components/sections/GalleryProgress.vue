<template>
  <GalleryBlock :title="t('gallery.progress.drive')" :note="t('gallery.progress.driveNote')">
    <M3Slider
      v-model="percent"
      class="w-full"
      :label="t('gallery.progress.drive')"
      :format="(v) => `${v}%`"
    />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.progress.loading')" :note="t('gallery.progress.loadingNote')">
    <M3LoadingIndicator :label="t('gallery.loading')" />
    <M3LoadingIndicator contained :label="t('gallery.loading')" />
    <M3LoadingIndicator :progress="value" :label="t('gallery.progress.determinate')" />
    <M3LoadingIndicator contained :size="72" :label="t('gallery.loading')" />
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.progress.linear')"
    :note="t('gallery.progress.linearNote')"
    stack
  >
    <M3LinearProgress :value="value" :label="t('gallery.progress.determinate')" />
    <M3LinearProgress :label="t('gallery.progress.indeterminate')" />
    <M3LinearProgress :value="value" :wavy="false" :label="t('gallery.progress.flat')" />
    <M3LinearProgress :value="value" :thickness="8" :label="t('gallery.progress.thick')" />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.progress.circular')" :note="t('gallery.progress.circularNote')">
    <M3CircularProgress :value="value" :label="t('gallery.progress.determinate')">{{
      percent
    }}</M3CircularProgress>
    <M3CircularProgress :label="t('gallery.progress.indeterminate')" />
    <M3CircularProgress :value="value" :wavy="false" :label="t('gallery.progress.flat')" />
    <M3CircularProgress
      :value="value"
      gauge
      :size="120"
      :thickness="8"
      :label="t('gallery.progress.gauge')"
    >
      <span class="type-title-large-emphasized pt-8">{{ percent }}%</span>
    </M3CircularProgress>
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const percent = ref(62);
const value = computed(() => percent.value / 100);
</script>
