<script setup lang="ts">
import { computed } from "vue";
import M3WheelPicker from "./M3WheelPicker.vue";
import type { WheelOption, WheelValue } from "./types.js";
import { parseIso, todayIso, clampIso, type IsoDate } from "../../utils/calendar.js";
import {
  composeWheelDate,
  orderDateColumns,
  wheelDayOptions,
  wheelMonthOptions,
  wheelYearOptions,
  type DateWheelLabels,
  type DateWheelParts,
} from "../../utils/dateWheel.js";

/**
 * A date spun on three drums - day, month, year in the locale's order - Framework7's date picker
 * in Material dress. It is always a valid date: spinning to a shorter month pulls the day back,
 * and anything outside `min`..`max` is disabled. An empty `v-model` starts at today. It edits
 * `v-model` directly; put it in a sheet with a draft when the choice needs confirming.
 */
const props = withDefaults(
  defineProps<{
    min?: IsoDate;
    max?: IsoDate;
    locale?: string;
    labels?: DateWheelLabels;
    label?: string;
    rows?: number;
  }>(),
  { labels: () => ({ day: "Day", month: "Month", year: "Year" }), rows: 7 },
);

const model = defineModel<IsoDate | null>({ default: null });

const locale = computed(() => props.locale ?? (document.documentElement.lang || "en"));
const fallback = () => clampIso(todayIso(), props.min, props.max);
const parts = computed<DateWheelParts>(() => parseIso(model.value) ?? parseIso(fallback())!);
if (!parseIso(model.value)) model.value = fallback();
/**
 * Each drum's options only rebuild when what they depend on moves - spinning the day leaves the
 * month and year lists untouched, so their drums never re-render.
 */
const year = computed(() => parts.value.year);
const month = computed(() => parts.value.month);
const bounds = computed(() => ({ min: props.min, max: props.max }));
const years = computed(() => wheelYearOptions(locale.value, bounds.value));
const months = computed<WheelOption<number>[]>((previous) =>
  same(previous, wheelMonthOptions(year.value, locale.value, bounds.value)),
);
const days = computed<WheelOption<number>[]>((previous) =>
  same(previous, wheelDayOptions(year.value, month.value, locale.value, bounds.value)),
);

/** The previous list when nothing in it changed, so a drum is not re-rendered for an equal copy. */
function same(previous: WheelOption<number>[] | undefined, next: WheelOption<number>[]) {
  if (
    previous?.length === next.length &&
    previous.every(
      (option, index) =>
        option.label === next[index]!.label && option.disabled === next[index]!.disabled,
    )
  )
    return previous;
  return next;
}
const columns = computed(() =>
  orderDateColumns(locale.value, props.labels, {
    day: days.value,
    month: months.value,
    year: years.value,
  }),
);
const values = computed<Record<string, WheelValue>>(() => ({ ...parts.value }));

function update(next: Record<string, WheelValue>) {
  model.value = composeWheelDate(
    { year: Number(next.year), month: Number(next.month), day: Number(next.day) },
    props.min,
    props.max,
  );
}
</script>

<template>
  <M3WheelPicker
    :model-value="values"
    :columns="columns"
    :rows="props.rows"
    :label="props.label"
    @update:model-value="update"
  />
</template>
