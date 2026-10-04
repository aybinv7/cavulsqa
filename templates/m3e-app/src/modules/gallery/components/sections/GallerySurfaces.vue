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

  <SectionHeader :title="t('gallery.surfaces.standard')" />
  <M3List variant="standard">
    <M3ListItem :headline="t('gallery.surfaces.wifi')" :supporting="t('gallery.surfaces.wifiText')">
      <template #action><M3Switch v-model="wifi" :label="t('gallery.surfaces.wifi')" /></template>
    </M3ListItem>
    <M3Divider inset="start" />
    <M3ListItem :headline="t('gallery.surfaces.storage')" trailing-text="12.4 GB" />
  </M3List>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const snackbar = useSnackbar();
const CARDS = ["elevated", "filled", "outlined"] as const;
const ITEMS = ["inbox", "drafts", "archive"] as const;
const QUESTIONS = ["offline", "sync", "storage", "export"] as const;

const selected = ref<(typeof ITEMS)[number]>("inbox");
const wifi = ref(true);

function tapped(variant: string) {
  void snackbar.show(t("gallery.surfaces.tapped", { variant }));
}
</script>
