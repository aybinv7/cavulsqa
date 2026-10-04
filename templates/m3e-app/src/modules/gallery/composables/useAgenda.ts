import { formatIso, todayIso, type YearMonth } from "@cavulsqa/m3e-vue";
import { marksAround, marksForMonth, visitsFor } from "@/modules/gallery/composables/routePlan";

export const AGENDA_VIEWS = ["day", "week", "month"] as const;
export type AgendaView = (typeof AGENDA_VIEWS)[number];

/**
 * The route agenda's state: which view is on (remembered between visits), the chosen day, its
 * visits, and the dots for whichever week or month is on screen. The month grid reports the month
 * it turns to, so its dots follow the arrows rather than only the chosen day.
 */
export function useAgenda() {
  const { t, locale } = useI18n();
  const today = todayIso();
  const day = ref(today);
  const stored = useLocalStorage<AgendaView>("gallery.agenda.view", "week");
  const view = computed<AgendaView>({
    get: () => (AGENDA_VIEWS.includes(stored.value) ? stored.value : "week"),
    set: (next) => (stored.value = next),
  });

  const shownMonth = shallowRef<YearMonth>(monthOf(today));
  watch(day, (next) => (shownMonth.value = monthOf(next)));

  const clock = useNow({ interval: 60_000 });
  const visits = computed(() =>
    visitsFor(day.value, today, clock.value.getHours() * 60 + clock.value.getMinutes()),
  );
  const weekMarks = computed(() => marksAround(day.value, today));
  const monthMarks = computed(() =>
    marksForMonth(shownMonth.value.year, shownMonth.value.month, today),
  );

  const month = computed(() =>
    formatIso(day.value, locale.value, { month: "long", year: "numeric" }),
  );
  const heading = computed(() =>
    formatIso(day.value, locale.value, { weekday: "long", day: "numeric", month: "long" }),
  );

  function visitsLabel(count: number) {
    return t("gallery.agenda.visits", { count }, count);
  }

  return {
    today,
    day,
    view,
    visits,
    weekMarks,
    monthMarks,
    shownMonth,
    month,
    heading,
    visitsLabel,
  };
}

function monthOf(iso: string): YearMonth {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
}
