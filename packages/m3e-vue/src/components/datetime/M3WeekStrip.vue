<script setup lang="ts">
import M3ShapeMorph from "../shape/M3ShapeMorph.vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useHaptics } from "../../composables/services.js";
import {
  addDays,
  firstDayOfWeek,
  formatIso,
  startOfWeek,
  todayIso,
  weekDays,
  type IsoDate,
} from "../../utils/calendar.js";

/**
 * A week of days to choose one from - the head of an agenda: a rep's visits, a driver's drops, a
 * clinic's appointments. Swipe to the next or previous week; it feels endless but holds three
 * weeks at a time. `marks` puts a dot under days with something on them (and their count in the
 * day's name for screen readers); the chosen day morphs into a shape, today is outlined. The arrow
 * keys move a day at a time across weeks, Home and End go to the week's ends. Inset the days with
 * `--m3-week-strip-inset` rather than padding: the weeks snap to the strip's own edges.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    locale?: string;
    firstDay?: number;
    marks?: Readonly<Record<IsoDate, number>>;
    markLabel?: (count: number) => string;
  }>(),
  {
    locale: undefined,
    firstDay: undefined,
    marks: () => ({}),
    markLabel: (count: number) => (count === 1 ? "1 item" : `${count} items`),
  },
);

const model = defineModel<IsoDate>({ default: () => todayIso() });

const track = useTemplateRef<HTMLElement>("track");
const haptics = useHaptics();
const locale = computed(
  () => props.locale ?? (typeof navigator === "undefined" ? "en" : navigator.language),
);
const first = computed(() => props.firstDay ?? firstDayOfWeek(locale.value));
const anchor = shallowRef(startOfWeek(model.value, first.value));
const today = todayIso();
let settling = false;
let idle: ReturnType<typeof setTimeout> | undefined;
const nativeScrollEnd = typeof window !== "undefined" && "onscrollend" in window;

const weeks = computed(() => [-7, 0, 7].map((offset) => weekDays(addDays(anchor.value, offset))));

const names = computed(() => {
  const short = new Intl.DateTimeFormat(locale.value, { weekday: "narrow", timeZone: "UTC" });
  return (day: IsoDate) => {
    const [year, month, date] = day.split("-").map(Number) as [number, number, number];
    return short.format(new Date(Date.UTC(year, month - 1, date)));
  };
});

function dayLabel(day: IsoDate): string {
  const full = formatIso(day, locale.value, { weekday: "long", day: "numeric", month: "long" });
  const count = props.marks[day] ?? 0;
  return count > 0 ? `${full}, ${props.markLabel(count)}` : full;
}

const direction = () => (track.value && getComputedStyle(track.value).direction === "rtl" ? -1 : 1);

function pageWidth(element: HTMLElement): number {
  return (element.firstElementChild as HTMLElement | null)?.offsetWidth || element.clientWidth;
}

function centre() {
  const element = track.value;
  if (!element) return;
  element.scrollLeft = pageWidth(element) * direction();
}

async function shift(weeksBy: number) {
  anchor.value = addDays(anchor.value, weeksBy * 7);
  settling = true;
  await nextTick();
  centre();
  settling = false;
}

function onScrollEnd() {
  const element = track.value;
  const size = element ? pageWidth(element) : 0;
  if (!element || settling || size === 0) return;
  const page = Math.round(Math.abs(element.scrollLeft) / size);
  if (page === 1) return;
  const delta = page === 0 ? -1 : 1;
  void shift(delta);
  model.value = addDays(model.value, delta * 7);
  haptics.tick();
}

function onScroll() {
  if (nativeScrollEnd) return;
  clearTimeout(idle);
  idle = setTimeout(onScrollEnd, 120);
}

function select(day: IsoDate) {
  if (day !== model.value) haptics.tick();
  model.value = day;
}

function onKeydown(event: KeyboardEvent) {
  const rtl = direction() === -1;
  const moves: Record<string, number> = {
    ArrowRight: rtl ? -1 : 1,
    ArrowLeft: rtl ? 1 : -1,
    ArrowDown: 7,
    ArrowUp: -7,
  };
  let next: IsoDate | null = null;
  if (event.key in moves) next = addDays(model.value, moves[event.key]!);
  else if (event.key === "Home") next = startOfWeek(model.value, first.value);
  else if (event.key === "End") next = addDays(startOfWeek(model.value, first.value), 6);
  if (!next) return;
  event.preventDefault();
  model.value = next;
  void nextTick(() => track.value?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus());
}

watch(model, (value) => {
  const week = startOfWeek(value, first.value);
  if (week !== anchor.value)
    void shift(Math.round((Date.parse(week) - Date.parse(anchor.value)) / 604_800_000));
});

watch(first, () => {
  anchor.value = startOfWeek(model.value, first.value);
});

onMounted(centre);
onBeforeUnmount(() => clearTimeout(idle));
</script>

<template>
  <div
    ref="track"
    class="m3-week-strip"
    role="group"
    :aria-label="props.label"
    @scroll.passive="onScroll"
    @scrollend="onScrollEnd"
    @keydown="onKeydown"
  >
    <div
      v-for="(week, index) in weeks"
      :key="week[0]"
      class="m3-week-strip__week"
      :inert="index !== 1"
    >
      <button
        v-for="day in week"
        :key="day"
        type="button"
        class="m3-week-strip__day m3-focus-ring"
        :class="{
          'm3-week-strip__day--selected': day === model,
          'm3-week-strip__day--today': day === today,
        }"
        :data-day="day"
        :tabindex="day === model ? 0 : -1"
        :aria-pressed="day === model"
        :aria-current="day === today ? 'date' : undefined"
        :aria-label="dayLabel(day)"
        @click="select(day)"
      >
        <span class="m3-week-strip__name" aria-hidden="true">{{ names(day) }}</span>
        <span class="m3-week-strip__date" aria-hidden="true">
          <M3ShapeMorph
            class="m3-week-strip__shape"
            :shape="day === model ? 'cookie9Sided' : 'circle'"
            :rotate="day === model ? 20 : 0"
          />
          <span class="m3-week-strip__number">{{ Number(day.slice(8)) }}</span>
        </span>
        <span
          class="m3-week-strip__mark"
          :class="{ 'm3-week-strip__mark--on': (props.marks[day] ?? 0) > 0 }"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.m3-week-strip {
  display: flex;
  padding-inline: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.m3-week-strip::-webkit-scrollbar {
  display: none;
}

.m3-week-strip__week {
  display: grid;
  box-sizing: border-box;
  flex: 0 0 100%;
  padding-inline: var(--m3-week-strip-inset, 8px);
  grid-template-columns: repeat(7, 1fr);
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.m3-week-strip__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: auto;
  min-width: 0;
  margin: 0;
  padding: 8px 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-large, 16px);
  background: none;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.m3-week-strip__name {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-week-strip__date {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
}

.m3-week-strip__shape {
  position: absolute;
  inset: 0;
  color: transparent;
  transition: color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-week-strip__day--today .m3-week-strip__shape {
  color: var(--md-sys-color-surface-container-highest);
}

.m3-week-strip__day--selected .m3-week-strip__shape {
  color: var(--md-sys-color-primary);
}

.m3-week-strip__number {
  position: relative;
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
  font-variant-numeric: tabular-nums;
  transition: color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-week-strip__day--today .m3-week-strip__number {
  color: var(--md-sys-color-primary);
}

.m3-week-strip__day--selected .m3-week-strip__number {
  color: var(--md-sys-color-on-primary);
}

.m3-week-strip__mark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
}

.m3-week-strip__mark--on {
  background: var(--md-sys-color-tertiary);
}
</style>
