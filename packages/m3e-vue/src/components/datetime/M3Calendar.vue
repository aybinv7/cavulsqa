<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, nextTick, shallowRef, useTemplateRef, watch } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";
import {
  addDays,
  addMonths,
  clampIso,
  firstDayOfWeek,
  formatIso,
  formatMonth,
  inRange,
  monthGrid,
  parseIso,
  todayIso,
  weekdayLabels,
  type IsoDate,
  type YearMonth,
} from "../../utils/calendar.js";

/**
 * The calendar inside the M3 date pickers: a month grid with the month and year menu, year
 * selection, single or range selection, and the full keyboard model - arrows move a day or a week,
 * Page Up/Down a month, Home/End the week's ends, Enter or Space selects. Dates are ISO strings
 * (`YYYY-MM-DD`) throughout.
 *
 * `outsideDays` fills all six weeks with the neighbouring months' days, muted - the grid keeps
 * Compose's fixed height without an empty band under a five-week month; tapping one selects it
 * and turns to its month.
 *
 * `marks` puts a dot under days with something on them, and their count in the day's label - the
 * same contract as `M3WeekStrip`, so an agenda can switch between the two. `month` reports the
 * month on show whenever it turns, so marks can be computed for just that month.
 *
 * @see https://m3.material.io/components/date-pickers/specs
 */
const props = withDefaults(
  defineProps<{
    mode?: "single" | "range";
    min?: IsoDate;
    max?: IsoDate;
    locale?: string;
    firstDay?: number;
    isDisabled?: (date: IsoDate) => boolean;
    previousLabel?: string;
    nextLabel?: string;
    yearLabel?: string;
    outsideDays?: boolean;
    marks?: Readonly<Record<IsoDate, number>>;
    markLabel?: (count: number) => string;
  }>(),
  {
    mode: "single",
    outsideDays: true,
    marks: () => ({}),
    markLabel: (count: number) => (count === 1 ? "1 item" : `${count} items`),
    previousLabel: "Previous month",
    nextLabel: "Next month",
    yearLabel: "Choose year",
  },
);

const value = defineModel<IsoDate | null>("value", { default: null });
const start = defineModel<IsoDate | null>("start", { default: null });
const end = defineModel<IsoDate | null>("end", { default: null });

const emit = defineEmits<{ month: [month: YearMonth] }>();

const haptics = useHaptics();
const grid = useTemplateRef<HTMLElement>("grid");
const years = useTemplateRef<HTMLElement>("years");
const locale = computed(
  () =>
    props.locale ?? (typeof document !== "undefined" ? document.documentElement.lang : "") ?? "en",
);
const first = computed(() => props.firstDay ?? firstDayOfWeek(locale.value || "en"));
const today = todayIso();

const anchor = () =>
  (props.mode === "range" ? start.value : value.value) ?? clampIso(today, props.min, props.max);
const initial = parseIso(anchor())!;
const visible = shallowRef<YearMonth>({ year: initial.year, month: initial.month });
const focused = shallowRef<IsoDate>(anchor());
const view = shallowRef<"days" | "years">("days");
const direction = shallowRef<"next" | "previous">("next");

const weeks = computed(() => monthGrid(visible.value, first.value, props.outsideDays));
const labels = computed(() => weekdayLabels(locale.value || "en", first.value));
const longLabels = computed(() => weekdayLabels(locale.value || "en", first.value, "short"));
const title = computed(() => formatMonth(visible.value, locale.value || "en"));
const monthKey = computed(() => `${visible.value.year}-${visible.value.month}`);

const minYear = computed(() => parseIso(props.min ?? "")?.year ?? new Date().getFullYear() - 100);
const maxYear = computed(() => parseIso(props.max ?? "")?.year ?? new Date().getFullYear() + 50);
const yearList = computed(() =>
  Array.from({ length: maxYear.value - minYear.value + 1 }, (_, i) => minYear.value + i),
);

const canPrevious = computed(() => !props.min || `${addMonthsIso(-1)}-31` >= props.min);
const canNext = computed(() => !props.max || `${addMonthsIso(1)}-01` <= props.max);

function addMonthsIso(delta: number) {
  const next = addMonths(visible.value, delta);
  return `${String(next.year).padStart(4, "0")}-${String(next.month + 1).padStart(2, "0")}`;
}

function disabled(date: IsoDate): boolean {
  return (
    (props.min !== undefined && date < props.min) ||
    (props.max !== undefined && date > props.max) ||
    (props.isDisabled?.(date) ?? false)
  );
}

function selected(date: IsoDate): boolean {
  return props.mode === "range" ? date === start.value || date === end.value : date === value.value;
}

function showMonth(next: YearMonth) {
  direction.value =
    next.year * 12 + next.month >= visible.value.year * 12 + visible.value.month
      ? "next"
      : "previous";
  visible.value = next;
  emit("month", next);
}

function step(delta: number) {
  showMonth(addMonths(visible.value, delta));
}

function choose(date: IsoDate) {
  if (disabled(date)) return;
  const parts = parseIso(date)!;
  if (parts.month !== visible.value.month || parts.year !== visible.value.year)
    showMonth({ year: parts.year, month: parts.month });
  focused.value = date;
  haptics.tick();
  if (props.mode === "single") {
    value.value = date;
    return;
  }
  if (!start.value || end.value || date < start.value) {
    start.value = date;
    end.value = null;
  } else {
    end.value = date;
  }
}

async function chooseYear(year: number) {
  showMonth({ year, month: visible.value.month });
  view.value = "days";
  haptics.tick();
  await nextTick();
  focusCell();
}

async function toggleYears() {
  view.value = view.value === "days" ? "years" : "days";
  if (view.value === "years") {
    await nextTick();
    years.value
      ?.querySelector<HTMLElement>("[aria-current='true'], [aria-selected='true']")
      ?.scrollIntoView({ block: "center" });
  }
}

function focusCell() {
  grid.value
    ?.querySelector<HTMLElement>(`[data-iso="${focused.value}"]`)
    ?.focus({ preventScroll: true });
}

async function move(date: IsoDate) {
  focused.value = clampIso(date, props.min, props.max);
  const parts = parseIso(focused.value)!;
  if (parts.year !== visible.value.year || parts.month !== visible.value.month)
    showMonth({ year: parts.year, month: parts.month });
  await nextTick();
  focusCell();
}

function onKeydown(event: KeyboardEvent) {
  const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl";
  const horizontal = rtl ? -1 : 1;
  const parts = parseIso(focused.value)!;
  const offset = (weekdayIndex(focused.value) - first.value + 7) % 7;
  const moves: Record<string, () => IsoDate> = {
    ArrowRight: () => addDays(focused.value, horizontal),
    ArrowLeft: () => addDays(focused.value, -horizontal),
    ArrowDown: () => addDays(focused.value, 7),
    ArrowUp: () => addDays(focused.value, -7),
    Home: () => addDays(focused.value, -offset),
    End: () => addDays(focused.value, 6 - offset),
    PageDown: () => shiftMonth(parts, 1),
    PageUp: () => shiftMonth(parts, -1),
  };
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    choose(focused.value);
    return;
  }
  const next = moves[event.key];
  if (!next) return;
  event.preventDefault();
  void move(next());
}

function shiftMonth(parts: { year: number; month: number; day: number }, delta: number): IsoDate {
  const target = addMonths(parts, delta);
  const day = Math.min(
    parts.day,
    new Date(Date.UTC(target.year, target.month + 1, 0)).getUTCDate(),
  );
  return `${String(target.year).padStart(4, "0")}-${String(target.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekdayIndex(date: IsoDate): number {
  const parts = parseIso(date)!;
  return new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
}

function cellLabel(date: IsoDate): string {
  const full = formatIso(date, locale.value || "en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const count = props.marks[date] ?? 0;
  return count > 0 ? `${full}, ${props.markLabel(count)}` : full;
}

watch([value, start], () => {
  const target = parseIso(props.mode === "range" ? start.value : value.value);
  if (target && (target.year !== visible.value.year || target.month !== visible.value.month)) {
    showMonth({ year: target.year, month: target.month });
  }
});
</script>

<template>
  <div class="m3-calendar">
    <div class="m3-calendar__header">
      <button
        v-ripple
        type="button"
        class="m3-calendar__month m3-state m3-focus-ring"
        :aria-label="`${props.yearLabel}: ${title}`"
        :aria-expanded="view === 'years'"
        @click="toggleYears"
      >
        <span>{{ title }}</span>
        <M3Glyph name="dropDown" :class="{ 'm3-calendar__caret--open': view === 'years' }" />
      </button>
      <div v-show="view === 'days'" class="m3-calendar__steps">
        <button
          v-ripple
          type="button"
          class="m3-calendar__step m3-state m3-focus-ring"
          :aria-label="props.previousLabel"
          :disabled="!canPrevious"
          @click="step(-1)"
        >
          <M3Glyph name="chevronLeft" />
        </button>
        <button
          v-ripple
          type="button"
          class="m3-calendar__step m3-state m3-focus-ring"
          :aria-label="props.nextLabel"
          :disabled="!canNext"
          @click="step(1)"
        >
          <M3Glyph name="chevronRight" />
        </button>
      </div>
    </div>

    <div
      v-if="view === 'years'"
      ref="years"
      class="m3-calendar__years"
      role="listbox"
      :aria-label="props.yearLabel"
    >
      <button
        v-for="year in yearList"
        :key="year"
        v-ripple
        type="button"
        role="option"
        class="m3-calendar__year m3-state m3-focus-ring"
        :class="{
          'm3-calendar__year--selected': year === visible.year,
          'm3-calendar__year--current': year === new Date().getFullYear(),
        }"
        :aria-selected="year === visible.year"
        :aria-current="year === new Date().getFullYear() || undefined"
        @click="chooseYear(year)"
      >
        {{ year }}
      </button>
    </div>

    <div v-else class="m3-calendar__days">
      <div class="m3-calendar__weekdays" aria-hidden="true">
        <span v-for="(label, index) in labels" :key="index" :title="longLabels[index]">{{
          label
        }}</span>
      </div>
      <div class="m3-calendar__viewport">
        <Transition :name="`m3-calendar-${direction}`">
          <div
            :key="monthKey"
            ref="grid"
            class="m3-calendar__grid"
            role="grid"
            :aria-label="title"
            @keydown="onKeydown"
          >
            <div v-for="(week, row) in weeks" :key="row" class="m3-calendar__week" role="row">
              <div
                v-for="cell in week"
                :key="cell.iso"
                role="gridcell"
                class="m3-calendar__cell"
                :class="{
                  'm3-calendar__cell--band':
                    props.mode === 'range' && cell.inMonth && inRange(cell.iso, start, end),
                  'm3-calendar__cell--band-start':
                    props.mode === 'range' && cell.inMonth && end && cell.iso === start,
                  'm3-calendar__cell--band-end':
                    props.mode === 'range' && cell.inMonth && start && cell.iso === end,
                }"
                :aria-selected="cell.inMonth ? selected(cell.iso) : undefined"
              >
                <button
                  v-if="!cell.inMonth && props.outsideDays"
                  type="button"
                  class="m3-calendar__day m3-calendar__day--outside m3-state"
                  tabindex="-1"
                  :disabled="disabled(cell.iso)"
                  :aria-label="cellLabel(cell.iso)"
                  @click="choose(cell.iso)"
                >
                  {{ cell.day }}
                </button>
                <button
                  v-else-if="cell.inMonth"
                  v-ripple="!disabled(cell.iso)"
                  type="button"
                  class="m3-calendar__day m3-state"
                  :class="{
                    'm3-calendar__day--today': cell.iso === today,
                    'm3-calendar__day--selected': selected(cell.iso),
                  }"
                  :data-iso="cell.iso"
                  :tabindex="cell.iso === focused ? 0 : -1"
                  :disabled="disabled(cell.iso)"
                  :aria-label="cellLabel(cell.iso)"
                  :aria-current="cell.iso === today ? 'date' : undefined"
                  @click="choose(cell.iso)"
                  @focus="focused = cell.iso"
                >
                  {{ cell.day }}
                  <span
                    v-if="(props.marks[cell.iso] ?? 0) > 0"
                    class="m3-calendar__mark"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m3-calendar {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 296px;
  color: var(--md-sys-color-on-surface);
}

.m3-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px 0 16px;
}

.m3-calendar__month {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 4px 0 8px;
  border: 0;
  border-radius: 20px;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  cursor: pointer;
}

.m3-calendar__month svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
  transition: rotate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-calendar__caret--open {
  rotate: 180deg;
}

.m3-calendar__steps {
  display: flex;
}

.m3-calendar__step {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

.m3-calendar__step svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

:global([dir="rtl"] .m3-calendar__step svg) {
  transform: scaleX(-1);
}

.m3-calendar__step:disabled {
  opacity: 0.38;
  cursor: default;
}

.m3-calendar__weekdays,
.m3-calendar__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 12px;
}

.m3-calendar__weekdays {
  height: 40px;
  align-items: center;
  text-align: center;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
}

.m3-calendar__viewport {
  position: relative;
  overflow: hidden;
  min-height: 288px;
}

.m3-calendar__grid {
  display: flex;
  flex-direction: column;
  outline: none;
}

.m3-calendar__cell {
  position: relative;
  display: grid;
  place-items: center;
  height: 48px;
}

.m3-calendar__cell--band::before,
.m3-calendar__cell--band-start::before,
.m3-calendar__cell--band-end::before {
  content: "";
  position: absolute;
  inset: 4px 0;
  background: var(--md-sys-color-secondary-container);
}

.m3-calendar__cell--band-start::before {
  inset-inline-start: 50%;
}

.m3-calendar__cell--band-end::before {
  inset-inline-end: 50%;
}

.m3-calendar__day {
  position: relative;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: none;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    color var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}

.m3-calendar__day:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: 0;
}

.m3-calendar__day--today {
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
}

.m3-calendar__day--selected {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  box-shadow: none;
}

.m3-calendar__day:disabled {
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  cursor: default;
}

.m3-calendar__mark {
  position: absolute;
  bottom: 4px;
  left: 50%;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  border-radius: 50%;
  background: var(--md-sys-color-tertiary);
}

.m3-calendar__day--selected .m3-calendar__mark {
  background: var(--md-sys-color-on-primary);
}

.m3-calendar__day--outside {
  color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 60%, transparent);
}

.m3-calendar__day--selected:disabled {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
}

.m3-calendar__day--today:disabled {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
}

.m3-calendar__years {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 0;
  max-height: 328px;
  overflow-y: auto;
  padding: 8px 12px;
  justify-items: center;
}

.m3-calendar__year {
  width: 72px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 18px;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  cursor: pointer;
}

.m3-calendar__year--current {
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
}

.m3-calendar__year--selected {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  box-shadow: none;
}

.m3-calendar-next-enter-active,
.m3-calendar-next-leave-active,
.m3-calendar-previous-enter-active,
.m3-calendar-previous-leave-active {
  transition:
    transform var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects);
}

.m3-calendar-next-leave-active,
.m3-calendar-previous-leave-active {
  position: absolute;
  inset: 0 0 auto;
}

.m3-calendar-next-enter-from,
.m3-calendar-previous-leave-to {
  opacity: 0;
  transform: translateX(32px);
}

.m3-calendar-next-leave-to,
.m3-calendar-previous-enter-from {
  opacity: 0;
  transform: translateX(-32px);
}
</style>
