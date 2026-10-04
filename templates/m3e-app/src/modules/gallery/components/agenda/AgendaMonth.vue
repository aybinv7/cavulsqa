<template>
  <div>
    <M3Card variant="filled" class="mx-4 mt-2 overflow-hidden py-2">
      <M3Calendar
        :value="day"
        @update:value="choose"
        :locale="locale"
        :marks="marks"
        :mark-label="markLabel"
        :previous-label="t('gallery.agenda.previousMonth')"
        :next-label="t('gallery.agenda.nextMonth')"
        :year-label="t('gallery.agenda.chooseYear')"
        @month="emit('month', $event)"
      />
    </M3Card>
    <AgendaVisitList :heading="heading" :visits="visits" />
  </div>
</template>

<script setup lang="ts">
import type { YearMonth } from "@cavulsqa/m3e-vue";
import AgendaVisitList from "@/modules/gallery/components/agenda/AgendaVisitList.vue";
import type { Visit } from "@/modules/gallery/composables/routePlan";

defineProps<{
  heading: string;
  visits: readonly Visit[];
  marks: Readonly<Record<string, number>>;
  markLabel: (count: number) => string;
}>();

const day = defineModel<string>({ required: true });
const emit = defineEmits<{ month: [month: YearMonth] }>();

const { t, locale } = useI18n();

function choose(next: string | null) {
  if (next) day.value = next;
}
</script>
