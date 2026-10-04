<script setup lang="ts">
import { computed } from "vue";
import M3WheelPicker from "./M3WheelPicker.vue";
import type { WheelColumn, WheelValue } from "./types.js";
import {
  dayPeriodLabels,
  parseIsoTime,
  snapIsoTime,
  toIsoTime,
  uses12Hour,
  type IsoTime,
} from "../../utils/time.js";

/**
 * A time spun on drums: hours, minutes and - where the locale reads a twelve-hour clock - AM/PM.
 * `v-model` is always `HH:mm` on the 24-hour clock whatever the drums show; `minuteStep` thins the
 * minutes to quarter hours or fives. An empty `v-model` starts at the current time.
 */
const props = withDefaults(
  defineProps<{
    locale?: string;
    hour12?: boolean;
    minuteStep?: number;
    labels?: { hour: string; minute: string; period: string };
    label?: string;
    rows?: number;
  }>(),
  {
    hour12: undefined,
    minuteStep: 1,
    labels: () => ({ hour: "Hour", minute: "Minute", period: "AM or PM" }),
    rows: 7,
  },
);

const model = defineModel<IsoTime | null>({ default: null });

const locale = computed(() => props.locale ?? (document.documentElement.lang || "en"));
const twelve = computed(() => props.hour12 ?? uses12Hour(locale.value));
const step = computed(() => Math.max(1, Math.floor(props.minuteStep)));

const now = () => {
  const date = new Date();
  return snapIsoTime(toIsoTime(date.getHours(), date.getMinutes()), step.value);
};
if (!parseIsoTime(model.value)) model.value = now();

const time = computed(() => parseIsoTime(model.value) ?? parseIsoTime(now())!);

const columns = computed<WheelColumn<number>[]>(() => {
  const number = new Intl.NumberFormat(locale.value, { minimumIntegerDigits: 2 });
  const hours = twelve.value
    ? Array.from({ length: 12 }, (_, index) => ({
        value: index,
        label: String(index === 0 ? 12 : index),
      }))
    : Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: number.format(hour) }));
  const minutes = Array.from({ length: Math.ceil(60 / step.value) }, (_, index) => ({
    value: index * step.value,
    label: number.format(index * step.value),
  }));
  const out: WheelColumn<number>[] = [
    { key: "hour", label: props.labels.hour, options: hours, align: "end", loop: true },
    {
      key: "minute",
      label: props.labels.minute,
      options: minutes,
      align: "center",
      flex: 0.6,
      loop: minutes.length > 2,
    },
  ];
  if (twelve.value) {
    const [am, pm] = dayPeriodLabels(locale.value);
    out.push({
      key: "period",
      label: props.labels.period,
      align: "start",
      options: [
        { value: 0, label: am },
        { value: 1, label: pm },
      ],
    });
  }
  return out;
});

const values = computed(() => {
  const { hour, minute } = time.value;
  const out: Record<string, WheelValue> = { hour, minute: minute - (minute % step.value) };
  if (twelve.value) {
    out.hour = hour % 12;
    out.period = hour >= 12 ? 1 : 0;
  }
  return out;
});

function update(next: Record<string, WheelValue>) {
  const hour = twelve.value
    ? (Number(next.hour) % 12) + (Number(next.period) === 1 ? 12 : 0)
    : Number(next.hour);
  model.value = toIsoTime(hour, Number(next.minute));
}
</script>

<template>
  <M3WheelPicker
    class="m3-time-wheel"
    :model-value="values"
    :columns="columns"
    :rows="props.rows"
    :label="props.label"
    @update:model-value="update"
  />
</template>
