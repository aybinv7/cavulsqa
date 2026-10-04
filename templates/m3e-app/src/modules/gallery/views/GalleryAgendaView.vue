<template>
  <AppPage :title="t('gallery.agenda.title')" :subtitle="month" back variant="small">
    <template #actions>
      <M3IconButton
        :label="t('gallery.agenda.today')"
        :disabled="day === today"
        @click="day = today"
      >
        <i-ms-today-outline-rounded />
      </M3IconButton>
    </template>
    <template #bottom>
      <M3WeekStrip
        v-model="day"
        class="bg-surface pb-2"
        :label="t('gallery.agenda.days')"
        :locale="locale"
        :marks="marks"
        :mark-label="visitsLabel"
      />
    </template>

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
  </AppPage>
</template>

<script setup lang="ts">
import { formatIso, todayIso } from "@cavulsqa/m3e-vue";
import { marksAround, visitsFor, type VisitState } from "@/modules/gallery/composables/routePlan";

const STATE_TONE: Record<VisitState, string> = {
  done: "text-on-surface-variant",
  next: "text-tertiary",
  planned: "text-on-surface-variant",
};

const { t, locale } = useI18n();
const today = todayIso();
const day = ref(today);

const visits = computed(() => visitsFor(day.value, today));
const marks = computed(() => marksAround(day.value, today));
const month = computed(() =>
  formatIso(day.value, locale.value, { month: "long", year: "numeric" }),
);
const heading = computed(() =>
  formatIso(day.value, locale.value, { weekday: "long", day: "numeric", month: "long" }),
);

function visitsLabel(count: number) {
  return t("gallery.agenda.visits", { count }, count);
}
</script>
