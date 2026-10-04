<template>
  <GalleryBlock :title="t('gallery.charts.line')" :note="t('gallery.charts.lineNote')" stack>
    <M3LineChart
      :labels="months"
      :series="sales"
      :label="t('gallery.charts.line')"
      :format="compact"
      area
    />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.charts.bar')" :note="t('gallery.charts.barNote')" stack>
    <div>
      <M3Chip
        kind="filter"
        :label="t('gallery.charts.stacked')"
        :selected="stacked"
        @update:selected="stacked = $event"
      />
    </div>
    <M3BarChart
      :labels="REPS"
      :series="reps"
      :label="t('gallery.charts.bar')"
      :format="compact"
      :stacked="stacked"
    />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.charts.donut')" :note="t('gallery.charts.donutNote')" stack>
    <M3DonutChart
      :segments="channels"
      :label="t('gallery.charts.donut')"
      :total-label="t('gallery.charts.total')"
      :format="compact"
    />
  </GalleryBlock>
</template>

<script setup lang="ts">
import type { ChartSeries } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const REPS = ["Karim", "Samir", "Nabil", "Yacine", "Walid"];

const { t, locale } = useI18n();
const stacked = ref(false);

const months = computed(() =>
  Array.from({ length: 12 }, (_, month) =>
    new Date(2026, month, 1).toLocaleDateString(locale.value, { month: "short" }),
  ),
);

const compact = (value: number) =>
  new Intl.NumberFormat(locale.value, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );

const sales = computed<ChartSeries[]>(() => [
  {
    label: t("gallery.charts.thisYear"),
    values: [420, 460, 510, 480, 560, 640, 700, 690, 760, 820, null, null].map((v) =>
      v === null ? null : v * 1000,
    ),
  },
  {
    label: t("gallery.charts.lastYear"),
    values: [380, 400, 430, 470, 450, 520, 580, 610, 600, 650, 700, 780].map((v) => v * 1000),
  },
]);

const reps = computed<ChartSeries[]>(() => [
  { label: t("gallery.charts.august"), values: [180, 140, 210, 95, 160].map((v) => v * 1000) },
  { label: t("gallery.charts.september"), values: [210, 120, 240, 130, 175].map((v) => v * 1000) },
]);

const channels = computed(() => [
  { label: t("gallery.charts.channels.shops"), value: 1_240_000 },
  { label: t("gallery.charts.channels.wholesale"), value: 860_000 },
  { label: t("gallery.charts.channels.online"), value: 310_000 },
  { label: t("gallery.charts.channels.export"), value: 120_000 },
]);
</script>
