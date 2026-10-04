<template>
  <GalleryBlock :title="t('gallery.progress.drive')" :note="t('gallery.progress.driveNote')">
    <M3Slider
      v-model="percent"
      class="w-full"
      :label="t('gallery.progress.drive')"
      :format="(v) => `${v}%`"
    />
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.progress.skeleton')"
    :note="t('gallery.progress.skeletonNote')"
    stack
  >
    <div class="flex flex-wrap items-center gap-2">
      <M3Chip
        v-for="option in EFFECTS"
        :key="option"
        kind="filter"
        :label="t(`gallery.progress.${option}`)"
        :selected="effect === option"
        @update:selected="effect = option"
      />
      <M3Button class="ms-auto" variant="tonal" size="s" :disabled="loading" @click="reload">{{
        t("gallery.progress.reload")
      }}</M3Button>
    </div>
    <M3Skeleton
      v-if="loading"
      class="flex flex-col gap-4 [--m3-skeleton-surface:var(--md-sys-color-surface-container-low)]"
      :effect="effect"
      :label="t('gallery.progress.loadingCustomers')"
    >
      <div v-for="row in 3" :key="row" class="flex items-center gap-4">
        <M3SkeletonBlock shape="circle" :width="40" />
        <div class="flex flex-1 flex-col">
          <M3SkeletonText :lines="1" typescale="body-large" width="45%" />
          <M3SkeletonText :lines="1" typescale="body-medium" width="30%" />
        </div>
      </div>
    </M3Skeleton>
    <div v-else class="flex flex-col gap-4">
      <div v-for="row in 3" :key="row" class="flex items-center gap-4">
        <M3Shape
          shape="cookie9Sided"
          class="size-10 bg-primary-container text-on-primary-container"
        >
          <span class="type-title-medium grid size-full place-items-center">{{ row }}</span>
        </M3Shape>
        <div class="flex flex-col">
          <span class="type-body-large text-on-surface">{{
            t("gallery.progress.customer", { n: row })
          }}</span>
          <span class="type-body-medium text-on-surface-variant">{{
            t("gallery.progress.customerNote", { count: row * 2 })
          }}</span>
        </div>
      </div>
    </div>
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
const EFFECTS = ["wave", "pulse"] as const;
const effect = ref<(typeof EFFECTS)[number]>("wave");
const loading = ref(true);
let timer: ReturnType<typeof setTimeout> | undefined;

function reload() {
  loading.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (loading.value = false), 2400);
}

onMounted(reload);
onBeforeUnmount(() => clearTimeout(timer));
const value = computed(() => percent.value / 100);
</script>
