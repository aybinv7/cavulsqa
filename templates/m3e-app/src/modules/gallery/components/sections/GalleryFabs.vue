<template>
  <GalleryBlock :title="t('gallery.fabs.sizes')" :note="t('gallery.fabs.sizesNote')">
    <M3Fab v-for="size in SIZES" :key="size" :size="size" :label="t('gallery.fabs.compose')">
      <i-ms-edit-outline-rounded />
    </M3Fab>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.fabs.colors')" :note="t('gallery.fabs.colorsNote')">
    <M3Fab v-for="color in COLORS" :key="color" :color="color" size="small" :label="color">
      <i-ms-add-rounded />
    </M3Fab>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.fabs.extended')" :note="t('gallery.fabs.extendedNote')">
    <M3Fab
      :extended="extended"
      :label="t('gallery.fabs.compose')"
      size="medium"
      @click="extended = !extended"
    >
      <i-ms-edit-outline-rounded />
    </M3Fab>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.fabs.menu')" :note="t('gallery.fabs.menuNote')">
    <div class="flex w-full justify-end pt-64">
      <M3FabMenu
        v-model:open="menuOpen"
        :label="t('gallery.fabs.create')"
        :close-label="t('shell.dismiss')"
      >
        <template #icon><i-ms-add-rounded /></template>
        <M3FabMenuItem :index="2" :label="t('gallery.fabs.order')" @click="done">
          <i-ms-receipt-long-outline-rounded />
        </M3FabMenuItem>
        <M3FabMenuItem :index="1" :label="t('gallery.fabs.customer')" @click="done">
          <i-ms-person-outline-rounded />
        </M3FabMenuItem>
        <M3FabMenuItem :index="0" :label="t('gallery.fabs.note')" @click="done">
          <i-ms-draft-outline-rounded />
        </M3FabMenuItem>
      </M3FabMenu>
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import type { FabColor, FabSize } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const snackbar = useSnackbar();

const SIZES: readonly FabSize[] = ["small", "default", "medium", "large"];
const COLORS: readonly FabColor[] = [
  "primary-container",
  "secondary-container",
  "tertiary-container",
  "primary",
  "secondary",
  "tertiary",
];

const extended = ref(true);
const menuOpen = ref(false);

function done() {
  void snackbar.show(t("gallery.fabs.picked"));
}
</script>
