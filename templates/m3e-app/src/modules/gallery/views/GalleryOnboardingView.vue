<template>
  <AppPage :title="t('gallery.onboarding.title')" back variant="small" class="gallery-onboarding">
    <M3Pager
      v-model:page="page"
      :label="t('gallery.onboarding.title')"
      class="gallery-onboarding__pager"
    >
      <M3PagerPage
        v-for="slide in SLIDES"
        :key="slide.id"
        :label="t(`gallery.onboarding.pages.${slide.id}.title`)"
      >
        <div class="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
          <M3Shape :shape="slide.shape" class="size-48" :class="slide.tone">
            <component :is="slide.icon" class="size-20" />
          </M3Shape>
          <h2 class="type-headline-medium-emphasized m-0 text-on-surface">
            {{ t(`gallery.onboarding.pages.${slide.id}.title`) }}
          </h2>
          <p class="type-body-large m-0 max-w-80 text-on-surface-variant">
            {{ t(`gallery.onboarding.pages.${slide.id}.text`) }}
          </p>
        </div>
      </M3PagerPage>

      <template #footer="{ page: current, count, progress, go, next }">
        <div class="flex items-center justify-between gap-2 px-4 pb-6 pt-2">
          <M3Button
            variant="text"
            :class="{ invisible: current === count - 1 }"
            @click="go(count - 1)"
          >
            {{ t("gallery.onboarding.skip") }}
          </M3Button>
          <M3PageIndicator
            :count="count"
            :progress="progress"
            :label="t('gallery.onboarding.title')"
            :page-label="pageLabel"
            @select="go"
          />
          <M3Button v-if="current < count - 1" @click="next">
            {{ t("gallery.onboarding.next") }}
          </M3Button>
          <M3Button v-else @click="finish">{{ t("gallery.onboarding.start") }}</M3Button>
        </div>
      </template>
    </M3Pager>
  </AppPage>
</template>

<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { Router } from "framework7/types";
import { markRaw, type Component } from "vue";
import OfflineIcon from "~icons/material-symbols/cloud-off-outline-rounded";
import RouteIcon from "~icons/material-symbols/route-outline-rounded";
import ReceiptIcon from "~icons/material-symbols/receipt-long-outline-rounded";

interface Slide {
  id: string;
  shape: MaterialShapeName;
  tone: string;
  icon: Component;
}

const SLIDES: readonly Slide[] = [
  {
    id: "route",
    shape: "cookie9Sided",
    tone: "bg-primary-container text-on-primary-container",
    icon: markRaw(RouteIcon),
  },
  {
    id: "orders",
    shape: "sunny",
    tone: "bg-tertiary-container text-on-tertiary-container",
    icon: markRaw(ReceiptIcon),
  },
  {
    id: "offline",
    shape: "clover4Leaf",
    tone: "bg-secondary-container text-on-secondary-container",
    icon: markRaw(OfflineIcon),
  },
];

const props = defineProps<{ f7router: Router.Router }>();
const { t } = useI18n();
const page = ref(0);

function pageLabel(n: number) {
  return t("gallery.onboarding.page", { n });
}

function finish() {
  props.f7router.back();
}
</script>

<style scoped>
:global(.gallery-onboarding .page-content) {
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}

.gallery-onboarding__pager {
  flex: 1;
  min-height: 0;
}

.gallery-onboarding__pager :deep(.m3-pager__track) {
  flex: 1;
}
</style>
