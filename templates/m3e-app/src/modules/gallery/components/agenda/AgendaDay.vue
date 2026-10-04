<template>
  <div ref="swipe" class="agenda-day">
    <h2 class="type-title-medium m-0 px-6 pt-4 text-on-surface">{{ heading }}</h2>
    <M3DayTimeline
      ref="timeline"
      :events="events"
      :start-hour="7"
      :end-hour="19"
      :hour-height="72"
      :locale="locale"
      :current="day === today"
      :label="heading"
      :event-label="eventLabel"
      @select="announce"
    >
      <template #event="{ event, start, end, compact }">
        <span class="type-title-small truncate">{{ event.visit.customer }}</span>
        <span class="type-body-small truncate opacity-80">
          {{ compact ? start : `${start} – ${end} · ${event.visit.city}` }}
        </span>
      </template>
    </M3DayTimeline>
    <EmptyState
      v-if="!events.length"
      shape="sunny"
      :headline="t('gallery.agenda.weekend')"
      :text="t('gallery.agenda.weekendText')"
    />
  </div>
</template>

<script setup lang="ts">
import {
  formatMinutes,
  minutesOfDay,
  useSnackbar,
  useSwipeStep,
  type TimelineEvent,
  type TimelineTone,
} from "@cavulsqa/m3e-vue";
import type { Visit, VisitState } from "@/modules/gallery/composables/routePlan";

interface VisitEvent extends TimelineEvent {
  visit: Visit;
}

const emit = defineEmits<{ step: [days: 1 | -1] }>();

const props = defineProps<{
  day: string;
  today: string;
  heading: string;
  visits: readonly Visit[];
}>();

const TONE: Record<VisitState, TimelineTone> = {
  done: "surface",
  next: "tertiary",
  planned: "primary",
};

const { t, locale } = useI18n();
const snackbar = useSnackbar();
const swipe = useTemplateRef<HTMLElement>("swipe");

useSwipeStep({ target: swipe, onStep: (step) => emit("step", step) });
const timeline = useTemplateRef<{
  scrollToMinute: (minute: number, behavior?: ScrollBehavior) => void;
}>("timeline");

const events = computed<VisitEvent[]>(() =>
  props.visits.map((visit) => ({
    id: visit.id,
    start: visit.start,
    end: visit.end,
    tone: TONE[visit.state],
    visit,
  })),
);

function eventLabel(event: VisitEvent) {
  const { visit } = event;
  return `${visit.customer}, ${visit.city}, ${formatMinutes(visit.start, locale.value)} – ${formatMinutes(visit.end, locale.value)}, ${t(`gallery.agenda.states.${visit.state}`)}`;
}

function announce(event: VisitEvent) {
  void snackbar.show(eventLabel(event));
}

function focusMinute(): number {
  if (props.day === props.today) return minutesOfDay();
  return props.visits[0]?.start ?? 8 * 60;
}

onMounted(() => nextTick(() => timeline.value?.scrollToMinute(focusMinute(), "auto")));
watch(
  () => props.day,
  () => nextTick(() => timeline.value?.scrollToMinute(focusMinute())),
);
</script>

<style scoped>
.agenda-day {
  touch-action: pan-y;
}
</style>
