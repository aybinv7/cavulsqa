<template>
  <GalleryBlock
    :title="t('gallery.navigation.primaryTabs')"
    :note="t('gallery.navigation.primaryTabsNote')"
    stack
  >
    <M3Tabs v-model="primary" :label="t('gallery.navigation.primaryTabs')">
      <M3Tab value="flights" :label="t('gallery.navigation.flights')">
        <template #icon><i-ms-local-shipping-outline-rounded /></template>
      </M3Tab>
      <M3Tab value="trips" :label="t('gallery.navigation.trips')">
        <template #icon><i-ms-bookmark-outline-rounded /></template>
      </M3Tab>
      <M3Tab value="explore" :label="t('gallery.navigation.explore')">
        <template #icon><i-ms-search-rounded /></template>
      </M3Tab>
    </M3Tabs>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.navigation.secondaryTabs')"
    :note="t('gallery.navigation.secondaryTabsNote')"
    stack
  >
    <M3Tabs
      v-model="secondary"
      variant="secondary"
      scrollable
      :label="t('gallery.navigation.secondaryTabs')"
    >
      <M3Tab
        v-for="tab in SCROLLING"
        :key="tab"
        :value="tab"
        :label="t(`gallery.navigation.months.${tab}`)"
      />
    </M3Tabs>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.navigation.bar')" :note="t('gallery.navigation.barNote')" stack>
    <div class="overflow-hidden rounded-md">
      <M3NavigationBar
        v-model="bar"
        layout="vertical"
        class="pb-0!"
        :label="t('gallery.navigation.bar')"
      >
        <M3NavigationItem value="inbox" :label="t('gallery.navigation.inbox')" :badge="3">
          <template #icon="{ selected }"
            ><i-ms-home-rounded v-if="selected" /><i-ms-home-outline-rounded v-else
          /></template>
        </M3NavigationItem>
        <M3NavigationItem value="starred" :label="t('gallery.navigation.starred')">
          <template #icon="{ selected }"
            ><i-ms-star-rounded v-if="selected" /><i-ms-star-outline-rounded v-else
          /></template>
        </M3NavigationItem>
        <M3NavigationItem value="saved" :label="t('gallery.navigation.saved')" badge>
          <template #icon="{ selected }"
            ><i-ms-bookmark-rounded v-if="selected" /><i-ms-bookmark-outline-rounded v-else
          /></template>
        </M3NavigationItem>
      </M3NavigationBar>
    </div>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.navigation.toolbar')"
    :note="t('gallery.navigation.toolbarNote')"
    stack
  >
    <div class="flex justify-center">
      <M3FloatingToolbar
        position="static"
        :variant="vibrant ? 'vibrant' : 'standard'"
        :label="t('gallery.navigation.toolbar')"
      >
        <M3IconButton :label="t('gallery.buttons.bold')"><i-ms-format-bold-rounded /></M3IconButton>
        <M3IconButton :label="t('gallery.buttons.italic')"
          ><i-ms-format-italic-rounded
        /></M3IconButton>
        <M3IconButton :label="t('gallery.buttons.underline')"
          ><i-ms-format-underlined-rounded
        /></M3IconButton>
        <M3IconButton
          v-model:selected="vibrant"
          toggle
          variant="filled"
          :label="t('gallery.navigation.vibrant')"
        >
          <i-ms-palette-outline-rounded />
        </M3IconButton>
        <template #fab>
          <M3Fab :label="t('gallery.fabs.compose')" color="tertiary-container"
            ><i-ms-add-rounded
          /></M3Fab>
        </template>
      </M3FloatingToolbar>
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const SCROLLING = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug"] as const;

const primary = ref("flights");
const secondary = ref<string>("mar");
const bar = ref("inbox");
const vibrant = ref(false);
</script>
