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
      <div>
        <M3ButtonGroup
          variant="connected"
          size="s"
          class="agenda-switcher px-4 pb-2"
          :label="t('gallery.agenda.view')"
        >
          <M3Button
            v-for="option in AGENDA_VIEWS"
            :key="option"
            variant="tonal"
            toggle
            :selected="view === option"
            @update:selected="view = option"
          >
            {{ t(`gallery.agenda.views.${option}`) }}
          </M3Button>
        </M3ButtonGroup>
        <M3WeekStrip
          v-if="view !== 'month'"
          v-model="day"
          class="pb-2"
          :label="t('gallery.agenda.days')"
          :locale="locale"
          :marks="weekMarks"
          :mark-label="visitsLabel"
        />
      </div>
    </template>

    <Transition name="agenda-through" mode="out-in" @enter="rewind">
      <AgendaDay
        v-if="view === 'day'"
        key="day"
        :day="day"
        :today="today"
        :heading="heading"
        :visits="visits"
      />
      <AgendaMonth
        v-else-if="view === 'month'"
        key="month"
        v-model="day"
        :heading="heading"
        :visits="visits"
        :marks="monthMarks"
        :mark-label="visitsLabel"
        @month="shownMonth = $event"
      />
      <AgendaVisitList v-else key="week" :heading="heading" :visits="visits" />
    </Transition>
  </AppPage>
</template>

<script setup lang="ts">
import AgendaDay from "@/modules/gallery/components/agenda/AgendaDay.vue";
import AgendaMonth from "@/modules/gallery/components/agenda/AgendaMonth.vue";
import AgendaVisitList from "@/modules/gallery/components/agenda/AgendaVisitList.vue";
import { AGENDA_VIEWS, useAgenda } from "@/modules/gallery/composables/useAgenda";

const { t, locale } = useI18n();
const { today, day, view, visits, weekMarks, monthMarks, shownMonth, month, heading, visitsLabel } =
  useAgenda();

function rewind(element: Element) {
  element.closest(".page-content")?.scrollTo({ top: 0 });
}
</script>

<style scoped>
.agenda-switcher {
  display: flex;
}

.agenda-switcher > :deep(*) {
  flex: 1 1 0;
}

.agenda-through-leave-active {
  transition: opacity 90ms var(--md-sys-motion-easing-emphasized-accelerate);
}

.agenda-through-enter-active {
  transition:
    opacity 210ms var(--md-sys-motion-easing-emphasized-decelerate),
    transform 210ms var(--md-sys-motion-easing-emphasized-decelerate);
}

.agenda-through-leave-to,
.agenda-through-enter-from {
  opacity: 0;
}

.agenda-through-enter-from {
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .agenda-through-enter-from {
    transform: none;
  }
}
</style>
