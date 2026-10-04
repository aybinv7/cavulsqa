<template>
  <div>
    <h2 class="type-title-medium m-0 px-6 pb-2 pt-4 text-on-surface">{{ heading }}</h2>
    <M3List v-if="visits.length" variant="segmented" inset>
      <M3ListItem
        v-for="visit in visits"
        :key="visit.id"
        :headline="visit.customer"
        :supporting="visit.city"
        :overline="visit.time"
      >
        <template #leading>
          <i-ms-check-circle-rounded v-if="visit.state === 'done'" class="text-primary" />
          <i-ms-near-me-rounded v-else-if="visit.state === 'next'" class="text-tertiary" />
          <i-ms-schedule-outline-rounded v-else class="text-on-surface-variant" />
        </template>
        <template #trailing>
          <span class="type-label-medium" :class="STATE_TONE[visit.state]">
            {{ t(`gallery.agenda.states.${visit.state}`) }}
          </span>
        </template>
      </M3ListItem>
    </M3List>
    <EmptyState
      v-else
      shape="sunny"
      :headline="t('gallery.agenda.weekend')"
      :text="t('gallery.agenda.weekendText')"
    />
  </div>
</template>

<script setup lang="ts">
import type { Visit, VisitState } from "@/modules/gallery/composables/routePlan";

defineProps<{ heading: string; visits: readonly Visit[] }>();

const STATE_TONE: Record<VisitState, string> = {
  done: "text-on-surface-variant",
  next: "text-tertiary",
  planned: "text-on-surface-variant",
};

const { t } = useI18n();
</script>
