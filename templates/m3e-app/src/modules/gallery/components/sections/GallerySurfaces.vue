<template>
  <GalleryBlock :title="t('gallery.surfaces.cards')" :note="t('gallery.surfaces.cardsNote')" stack>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
      <M3Card
        v-for="variant in CARDS"
        :key="variant"
        :variant="variant"
        clickable
        @click="tapped(variant)"
      >
        <div class="flex flex-col gap-3 p-4">
          <M3Shape
            shape="cookie4Sided"
            class="size-10 bg-tertiary-container text-on-tertiary-container"
          >
            <i-ms-star-outline-rounded class="size-5" />
          </M3Shape>
          <span class="type-title-medium">{{ variant }}</span>
          <span class="type-body-medium text-on-surface-variant">{{
            t("gallery.surfaces.cardText")
          }}</span>
        </div>
      </M3Card>
    </div>
  </GalleryBlock>

  <SectionHeader :title="t('gallery.surfaces.segmented')" />
  <M3List variant="segmented" inset>
    <M3ListItem
      v-for="item in ITEMS"
      :key="item"
      clickable
      :headline="t(`gallery.surfaces.items.${item}.title`)"
      :supporting="t(`gallery.surfaces.items.${item}.text`)"
      :selected="selected === item"
      @click="selected = item"
    >
      <template #leading><i-ms-inventory-2-outline-rounded /></template>
      <template #trailing><M3Badge v-if="item === 'inbox'" :count="12" /></template>
    </M3ListItem>
  </M3List>

  <SectionHeader :title="t('gallery.surfaces.accordion')" />
  <p class="type-body-small m-0 px-8 pb-3 text-on-surface-variant">
    {{ t("gallery.surfaces.accordionNote") }}
  </p>
  <M3List variant="segmented" inset accordion>
    <M3ListItem
      v-for="question in QUESTIONS"
      :key="question"
      :headline="t(`gallery.surfaces.faq.${question}.q`)"
    >
      <template #leading><i-ms-help-outline-rounded /></template>
      <template #details>{{ t(`gallery.surfaces.faq.${question}.a`) }}</template>
    </M3ListItem>
  </M3List>

  <SectionHeader :title="t('gallery.surfaces.sortable')" />
  <p class="type-body-small m-0 px-8 pb-3 text-on-surface-variant">
    {{ t("gallery.surfaces.sortableNote") }}
  </p>
  <M3List
    variant="segmented"
    inset
    sortable
    :reorder-label="t('gallery.surfaces.reorder')"
    :moved-text="movedText"
    @sort="(from, to) => (route = moveItem(route, from, to))"
  >
    <M3ListItem
      v-for="(stop, index) in route"
      :key="stop"
      :headline="t(`gallery.surfaces.stops.${stop}`)"
      :supporting="t('gallery.surfaces.stopOrder', { n: index + 1 })"
    >
      <template #leading><i-ms-local-shipping-outline-rounded /></template>
    </M3ListItem>
  </M3List>

  <SectionHeader :title="t('gallery.surfaces.standard')" />
  <M3List variant="standard">
    <M3ListItem :headline="t('gallery.surfaces.wifi')" :supporting="t('gallery.surfaces.wifiText')">
      <template #action><M3Switch v-model="wifi" :label="t('gallery.surfaces.wifi')" /></template>
    </M3ListItem>
    <M3Divider inset="start" />
    <M3ListItem :headline="t('gallery.surfaces.storage')" trailing-text="12.4 GB" />
  </M3List>

  <SectionHeader :title="t('gallery.surfaces.timeline')" />
  <div class="px-6 pb-2">
    <M3Timeline :label="t('gallery.surfaces.tracking')">
      <M3TimelineItem
        v-for="step in STEPS"
        :key="step.id"
        :title="t(`gallery.surfaces.steps.${step.id}.title`)"
        :supporting="t(`gallery.surfaces.steps.${step.id}.text`)"
        :time="step.time"
        :state="step.state"
        :state-label="t(`gallery.surfaces.states.${step.state}`)"
      >
        <template v-if="step.state === 'current'" #icon
          ><i-ms-local-shipping-outline-rounded
        /></template>
      </M3TimelineItem>
    </M3Timeline>
  </div>

  <SectionHeader :title="t('gallery.surfaces.infinite')" />
  <p class="type-body-small m-0 px-8 pb-3 text-on-surface-variant">
    {{ t("gallery.surfaces.infiniteNote") }}
  </p>
  <M3List variant="segmented" inset>
    <M3ListItem
      v-for="order in endless"
      :key="order"
      :headline="t('gallery.tabs.order', { n: order })"
      :supporting="t('gallery.surfaces.page', { n: Math.ceil((order - 5000) / 15) })"
    >
      <template #leading><i-ms-receipt-long-outline-rounded /></template>
    </M3ListItem>
  </M3List>
  <M3InfiniteScroll
    :load="loadMore"
    :loading-label="t('gallery.surfaces.loadingMore')"
    :error-text="t('gallery.surfaces.loadFailed')"
    :retry-label="t('gallery.surfaces.retry')"
    :end-text="t('gallery.surfaces.allLoaded')"
  />
</template>

<script setup lang="ts">
import { moveItem } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const snackbar = useSnackbar();
const CARDS = ["elevated", "filled", "outlined"] as const;
const ITEMS = ["inbox", "drafts", "archive"] as const;
const QUESTIONS = ["offline", "sync", "storage", "export"] as const;
const STEPS = [
  { id: "placed", time: "08:12", state: "done" },
  { id: "confirmed", time: "08:40", state: "done" },
  { id: "picked", time: "10:05", state: "done" },
  { id: "transit", time: "11:20", state: "current" },
  { id: "delivered", time: "", state: "upcoming" },
] as const;
const PAGE = 15;
const PAGES = 5;
const endless = ref<number[]>([]);
let failedOnce = false;

async function loadMore(): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const page = endless.value.length / PAGE;
  if (page === 2 && !failedOnce) {
    failedOnce = true;
    throw new Error("simulated network failure");
  }
  const start = 5001 + endless.value.length;
  endless.value = [...endless.value, ...Array.from({ length: PAGE }, (_, i) => start + i)];
  return page + 1 < PAGES;
}
const route = ref(["warehouse", "market", "pharmacy", "school", "bakery"]);

function movedText(label: string, position: number, count: number) {
  return t("gallery.surfaces.moved", { label, position, count });
}

const selected = ref<(typeof ITEMS)[number]>("inbox");
const wifi = ref(true);

function tapped(variant: string) {
  void snackbar.show(t("gallery.surfaces.tapped", { variant }));
}
</script>
