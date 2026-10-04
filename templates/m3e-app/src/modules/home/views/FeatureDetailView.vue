<template>
  <AppPage :title="feature ? t(feature.titleKey) : t('errors.notFoundTitle')" variant="medium" back>
    <template v-if="feature">
      <section class="flex flex-col items-center gap-4 px-6 pt-4 pb-2 text-center">
        <M3Shape :shape="feature.shape" class="size-32" :class="TONE_CLASSES[feature.tone]">
          <component :is="feature.icon" class="size-12" />
        </M3Shape>
        <p class="type-title-medium m-0 text-on-surface-variant">{{ t(feature.subtitleKey) }}</p>
        <p class="type-body-large m-0 max-w-[36rem] text-on-surface">{{ t(feature.textKey) }}</p>
      </section>

      <SectionHeader :title="t('detail.thisScreen')" />
      <M3List variant="segmented" inset>
        <M3ListItem
          :headline="t('detail.transition')"
          :supporting="t('detail.transitionNote', { name: transitionName(feature) })"
          :trailing-text="transitionName(feature)"
          multiline
        >
          <template #leading><i-ms-swipe-rounded /></template>
        </M3ListItem>
        <M3ListItem :headline="t('detail.appBar')" :supporting="t('detail.appBarNote')" multiline>
          <template #leading><i-ms-web-rounded /></template>
        </M3ListItem>
        <M3ListItem :headline="t('detail.nesting')" :supporting="t('detail.nestingNote')" multiline>
          <template #leading><i-ms-widgets-outline-rounded /></template>
        </M3ListItem>
      </M3List>

      <div class="flex justify-end px-4 pt-6">
        <M3Button variant="tonal" size="m" @click="openNext">
          {{ t("detail.next") }}
          <template #trailing><i-ms-chevron-right-rounded class="rtl:-scale-x-100" /></template>
        </M3Button>
      </div>
    </template>

    <EmptyState
      v-else
      shape="ghostish"
      :headline="t('errors.notFoundTitle')"
      :text="t('errors.notFound')"
    />
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { features, findFeature } from "@/modules/home/composables/useHomeFeatures";
import { transitionName, useOpenFeature } from "@/modules/home/composables/useOpenFeature";
import { TONE_CLASSES } from "@/shared/utils/tone";

const { t } = useI18n();
const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();

const openFeature = useOpenFeature();

const feature = computed(() => findFeature(String(props.f7route.params.id ?? "")));

/** Pushes the next feature onto this tab's own history, so the stack grows inside the tab. */
function openNext() {
  const index = features.findIndex((entry) => entry.id === feature.value?.id);
  const next = features[(index + 1) % features.length];
  if (next) openFeature(props.f7router, next);
}
</script>
