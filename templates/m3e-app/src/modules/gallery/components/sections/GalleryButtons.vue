<template>
  <GalleryBlock :title="t('gallery.buttons.variants')" :note="t('gallery.buttons.variantsNote')">
    <M3Button v-for="variant in VARIANTS" :key="variant" :variant="variant">{{ variant }}</M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.buttons.sizes')" :note="t('gallery.buttons.sizesNote')" stack>
    <div v-for="size in SIZES" :key="size" class="flex flex-wrap items-center gap-3">
      <M3Button :size="size">
        <template #icon><i-ms-add-rounded /></template>
        {{ size.toUpperCase() }}
      </M3Button>
      <M3Button :size="size" shape="square" variant="tonal">{{ size.toUpperCase() }}</M3Button>
    </div>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.buttons.toggle')" :note="t('gallery.buttons.toggleNote')">
    <M3Button v-model:selected="saved" toggle size="m">
      <template #icon="{ selected }">
        <i-ms-bookmark-rounded v-if="selected" />
        <i-ms-bookmark-outline-rounded v-else />
      </template>
      {{ t("gallery.buttons.save") }}
    </M3Button>
    <M3Button v-model:selected="starred" toggle variant="outlined" size="m" shape="square">
      {{ t("gallery.buttons.star") }}
    </M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.buttons.icon')" :note="t('gallery.buttons.iconNote')">
    <M3IconButton
      :label="t('gallery.buttons.favorite')"
      variant="standard"
      toggle
      :selected="liked"
      @update:selected="liked = $event"
    >
      <template #default="{ selected }">
        <i-ms-favorite-rounded v-if="selected" />
        <i-ms-favorite-outline-rounded v-else />
      </template>
    </M3IconButton>
    <M3IconButton :label="t('gallery.buttons.share')" variant="filled" width="wide"
      ><i-ms-share-outline-rounded
    /></M3IconButton>
    <M3IconButton :label="t('gallery.buttons.edit')" variant="tonal" size="m" shape="square"
      ><i-ms-edit-outline-rounded
    /></M3IconButton>
    <M3IconButton :label="t('gallery.buttons.more')" variant="outlined" width="narrow"
      ><i-ms-more-vert-rounded
    /></M3IconButton>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.buttons.group')" :note="t('gallery.buttons.groupNote')">
    <M3ButtonGroup size="m" :label="t('gallery.buttons.group')">
      <M3IconButton :label="t('gallery.buttons.bold')" variant="tonal"
        ><i-ms-format-bold-rounded
      /></M3IconButton>
      <M3IconButton :label="t('gallery.buttons.italic')" variant="tonal"
        ><i-ms-format-italic-rounded
      /></M3IconButton>
      <M3IconButton :label="t('gallery.buttons.underline')" variant="tonal"
        ><i-ms-format-underlined-rounded
      /></M3IconButton>
    </M3ButtonGroup>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.buttons.connected')" :note="t('gallery.buttons.connectedNote')">
    <M3ButtonGroup variant="connected" size="s" :label="t('gallery.buttons.connected')">
      <M3Button
        v-for="period in PERIODS"
        :key="period"
        variant="tonal"
        toggle
        :selected="range === period"
        @update:selected="range = period"
      >
        {{ t(`gallery.buttons.periods.${period}`) }}
      </M3Button>
    </M3ButtonGroup>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.buttons.split')" :note="t('gallery.buttons.splitNote')">
    <M3SplitButton
      v-model:open="splitOpen"
      size="m"
      :menu-label="t('gallery.buttons.moreOptions')"
      @click="sent"
    >
      <template #icon><i-ms-share-outline-rounded /></template>
      {{ t("gallery.buttons.send") }}
      <template #menu>
        <span ref="splitAnchor" class="absolute inset-0 pointer-events-none" />
      </template>
    </M3SplitButton>
    <M3Menu
      v-model:open="splitOpen"
      :anchor="splitAnchor"
      align="end"
      :label="t('gallery.buttons.moreOptions')"
    >
      <M3MenuItem :label="t('gallery.buttons.schedule')" @select="sent" />
      <M3MenuItem :label="t('gallery.buttons.saveDraft')" @select="sent" />
    </M3Menu>
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import type { ButtonSize } from "@cavulsqa/m3e-vue";

const { t } = useI18n();
const snackbar = useSnackbar();

const VARIANTS = ["filled", "tonal", "outlined", "elevated", "text"] as const;
const SIZES: readonly ButtonSize[] = ["xs", "s", "m", "l", "xl"];
const PERIODS = ["day", "week", "month"] as const;

const saved = ref(false);
const starred = ref(true);
const liked = ref(false);
const range = ref<(typeof PERIODS)[number]>("week");
const splitOpen = ref(false);
const splitAnchor = useTemplateRef<HTMLElement>("splitAnchor");

function sent() {
  void snackbar.show(t("gallery.buttons.sent"));
}
</script>
