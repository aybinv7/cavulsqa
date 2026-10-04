<template>
  <GalleryBlock
    :title="t('gallery.carousels.multiBrowse')"
    :note="t('gallery.carousels.multiBrowseNote')"
    stack
  >
    <M3Carousel
      class="-mx-4 w-[calc(100%+2rem)]"
      :items="PLACES"
      :item-key="placeKey"
      :label="t('gallery.carousels.multiBrowse')"
      :slide-label="slideLabel"
    >
      <template #default="{ item, scrollTo }">
        <GalleryCarouselTile
          :title="t(`gallery.carousels.places.${item.id}`)"
          :icon="item.icon"
          :shape="item.shape"
          :from="item.from"
          :to="item.to"
          @select="scrollTo"
        />
      </template>
    </M3Carousel>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.carousels.hero')" :note="t('gallery.carousels.heroNote')" stack>
    <M3Carousel
      v-model:item="featured"
      class="-mx-4 w-[calc(100%+2rem)]"
      variant="hero"
      :items="PLACES.slice(0, 6)"
      :item-key="placeKey"
      :label="t('gallery.carousels.hero')"
      :slide-label="slideLabel"
    >
      <template #default="{ item, scrollTo }">
        <GalleryCarouselTile
          :title="t(`gallery.carousels.places.${item.id}`)"
          :icon="item.icon"
          :shape="item.shape"
          :from="item.from"
          :to="item.to"
          @select="scrollTo"
        />
      </template>
    </M3Carousel>
    <span class="type-body-medium text-on-surface-variant">{{
      t("gallery.carousels.featured", {
        place: t(`gallery.carousels.places.${PLACES[featured]!.id}`),
      })
    }}</span>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.carousels.uncontained')"
    :note="t('gallery.carousels.uncontainedNote')"
    stack
  >
    <M3Carousel
      class="-mx-4 w-[calc(100%+2rem)]"
      variant="uncontained"
      :items="PLACES"
      :item-key="placeKey"
      :item-width="160"
      :height="180"
      :label="t('gallery.carousels.uncontained')"
      :slide-label="slideLabel"
    >
      <template #default="{ item }">
        <GalleryCarouselTile
          :title="t(`gallery.carousels.places.${item.id}`)"
          :icon="item.icon"
          :shape="item.shape"
          :from="item.from"
          :to="item.to"
        />
      </template>
    </M3Carousel>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.carousels.photos')"
    :note="t('gallery.carousels.photosNote')"
    stack
  >
    <div class="grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
      <button
        v-for="(photo, position) in photos"
        :key="position"
        type="button"
        class="aspect-square w-full overflow-hidden border-0 p-0"
        :aria-label="photo.alt"
        @click="openPhoto(position)"
      >
        <img :src="photo.src" alt="" class="size-full object-cover" decoding="async" />
      </button>
    </div>
  </GalleryBlock>

  <M3PhotoBrowser
    v-model:open="browserOpen"
    v-model:index="photoIndex"
    :photos="photos"
    :label="t('gallery.carousels.photos')"
    :close-label="t('shell.dismiss')"
    :counter-text="counterText"
  />
</template>

<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";
import { markRaw, type Component } from "vue";
import BeachIcon from "~icons/material-symbols/beach-access-outline-rounded";
import CafeIcon from "~icons/material-symbols/local-cafe-outline-rounded";
import CityIcon from "~icons/material-symbols/location-city-rounded";
import ForestIcon from "~icons/material-symbols/forest-outline-rounded";
import HikingIcon from "~icons/material-symbols/hiking-rounded";
import LandscapeIcon from "~icons/material-symbols/landscape-outline-rounded";
import ParkIcon from "~icons/material-symbols/park-outline-rounded";
import SailingIcon from "~icons/material-symbols/sailing-outline-rounded";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import GalleryCarouselTile from "@/modules/gallery/components/GalleryCarouselTile.vue";
import { usePhotoScenes } from "@/modules/gallery/composables/usePhotoScenes";

interface Place {
  id: string;
  icon: Component;
  shape: MaterialShapeName;
  from: string;
  to: string;
}

const { t } = useI18n();
const featured = ref(0);
const browserOpen = ref(false);
const photoIndex = ref(0);
const { photos } = usePhotoScenes((kind) => t(`gallery.carousels.scenes.${kind}`));
useDarkStatusBar(() => browserOpen.value);

function openPhoto(position: number) {
  photoIndex.value = position;
  browserOpen.value = true;
}

function counterText(position: number, count: number) {
  return t("gallery.carousels.counter", { position, count });
}

const PLACES: readonly Place[] = [
  {
    id: "mountains",
    icon: markRaw(LandscapeIcon),
    shape: "cookie9Sided",
    from: "primary-container",
    to: "tertiary-container",
  },
  {
    id: "forest",
    icon: markRaw(ForestIcon),
    shape: "clover4Leaf",
    from: "secondary-container",
    to: "primary-container",
  },
  {
    id: "coast",
    icon: markRaw(BeachIcon),
    shape: "sunny",
    from: "tertiary-container",
    to: "secondary-container",
  },
  {
    id: "city",
    icon: markRaw(CityIcon),
    shape: "pentagon",
    from: "primary-container",
    to: "secondary-container",
  },
  {
    id: "harbour",
    icon: markRaw(SailingIcon),
    shape: "flower",
    from: "tertiary-container",
    to: "primary-container",
  },
  {
    id: "trail",
    icon: markRaw(HikingIcon),
    shape: "softBurst",
    from: "secondary-container",
    to: "tertiary-container",
  },
  {
    id: "park",
    icon: markRaw(ParkIcon),
    shape: "gem",
    from: "primary-container",
    to: "tertiary-container",
  },
  {
    id: "cafe",
    icon: markRaw(CafeIcon),
    shape: "cookie4Sided",
    from: "tertiary-container",
    to: "secondary-container",
  },
];

function placeKey(place: Place) {
  return place.id;
}

function slideLabel(index: number, count: number) {
  return t("gallery.carousels.slide", { n: index + 1, count });
}
</script>
