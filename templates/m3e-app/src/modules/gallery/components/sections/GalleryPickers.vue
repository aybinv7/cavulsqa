<template>
  <GalleryBlock :title="t('gallery.pickers.modal')" :note="t('gallery.pickers.modalNote')">
    <M3Button variant="tonal" @click="dateOpen = true">
      <template #icon><i-ms-calendar-today-outline-rounded /></template>
      {{ date ? formatted(date) : t("gallery.pickers.pick") }}
    </M3Button>
    <M3DatePicker v-model="date" v-model:open="dateOpen" v-bind="dateLabels" :locale="locale" />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.pickers.sheet')" :note="t('gallery.pickers.sheetNote')">
    <M3Button variant="tonal" @click="sheetOpen = true">
      <template #icon><i-ms-event-upcoming-outline-rounded /></template>
      {{ sheetDate ? formatted(sheetDate) : t("gallery.pickers.pick") }}
    </M3Button>
    <M3DatePicker
      v-model="sheetDate"
      v-model:open="sheetOpen"
      presentation="sheet"
      v-bind="dateLabels"
      :locale="locale"
    />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.pickers.time')" :note="t('gallery.pickers.timeNote')">
    <M3Button variant="tonal" @click="timeOpen = true">
      <template #icon><i-ms-schedule-outline-rounded /></template>
      {{ time ? formatIsoTime(time, locale) : t("gallery.pickers.pickTime") }}
    </M3Button>
    <M3TimePicker v-model="time" v-model:open="timeOpen" v-bind="timeLabels" :locale="locale" />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.pickers.timeSheet')" :note="t('gallery.pickers.timeSheetNote')">
    <M3Button variant="tonal" @click="timeSheetOpen = true">
      <template #icon><i-ms-alarm-outline-rounded /></template>
      {{ sheetTime ? formatIsoTime(sheetTime, locale) : t("gallery.pickers.pickTime") }}
    </M3Button>
    <M3TimePicker
      v-model="sheetTime"
      v-model:open="timeSheetOpen"
      presentation="sheet"
      :minute-step="15"
      v-bind="timeLabels"
      :locale="locale"
    />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.pickers.docked')" :note="t('gallery.pickers.dockedNote')" stack>
    <div class="overflow-hidden rounded-lg bg-surface-container-high">
      <M3Calendar v-model:value="inline" :min="today" :locale="locale" :is-disabled="isSunday" />
    </div>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.pickers.range')" :note="t('gallery.pickers.rangeNote')" stack>
    <div class="overflow-hidden rounded-lg bg-surface-container-high">
      <M3Calendar v-model:start="start" v-model:end="end" mode="range" :locale="locale" />
    </div>
    <p class="type-body-medium m-0 text-on-surface-variant">
      {{ start ? formatted(start) : "—" }} → {{ end ? formatted(end) : "—" }}
    </p>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.pickers.dateWheel')"
    :note="t('gallery.pickers.dateWheelNote')"
    stack
  >
    <div class="rounded-lg bg-surface-container-low py-2">
      <M3DateWheel
        v-model="wheelDate"
        :locale="locale"
        :label="t('gallery.pickers.dateWheel')"
        :labels="{
          day: t('gallery.pickers.day'),
          month: t('gallery.pickers.month'),
          year: t('gallery.pickers.year'),
        }"
        :rows="5"
      />
    </div>
    <p class="type-body-medium m-0 text-on-surface-variant">
      {{ wheelDate ? formatted(wheelDate) : "—" }}
    </p>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.pickers.wheel')" :note="t('gallery.pickers.wheelNote')" stack>
    <div class="rounded-lg bg-surface-container-low py-2">
      <M3WheelPicker v-model="quantity" :columns="quantityColumns" :rows="5" />
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import {
  addDays,
  formatIso,
  formatIsoTime,
  todayIso,
  weekday,
  type IsoDate,
  type IsoTime,
  type WheelColumn,
  type WheelValue,
} from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t, locale } = useI18n();
const today = todayIso();
const date = ref<IsoDate | null>(null);
const dateOpen = ref(false);
const sheetDate = ref<IsoDate | null>(null);
const sheetOpen = ref(false);
const time = ref<IsoTime | null>(null);
const timeOpen = ref(false);
const sheetTime = ref<IsoTime | null>(null);
const timeSheetOpen = ref(false);
const isSunday = (value: IsoDate) => weekday(value) === 0;
const inline = ref<IsoDate | null>(isSunday(today) ? addDays(today, 1) : today);
const start = ref<IsoDate | null>(null);
const end = ref<IsoDate | null>(null);
const wheelDate = ref<IsoDate | null>(null);
const quantity = ref<Record<string, WheelValue>>({ count: 12, unit: "box" });

const dateLabels = computed(() => ({
  title: t("gallery.pickers.selectDate"),
  emptyHeadline: t("gallery.pickers.selectedDate"),
  confirmLabel: t("gallery.pickers.ok"),
  dismissLabel: t("gallery.overlays.cancel"),
  inputLabel: t("gallery.pickers.typeDate"),
  calendarLabel: t("gallery.pickers.useCalendar"),
  wheelLabel: t("gallery.pickers.useWheel"),
  invalidLabel: t("gallery.pickers.invalid"),
}));

const timeLabels = computed(() => ({
  title: t("gallery.pickers.selectTime"),
  confirmLabel: t("gallery.pickers.ok"),
  dismissLabel: t("gallery.overlays.cancel"),
  dialLabel: t("gallery.pickers.useDial"),
  inputLabel: t("gallery.pickers.useKeyboard"),
  wheelLabel: t("gallery.pickers.useWheel"),
  hourLabel: t("gallery.pickers.hour"),
  minuteLabel: t("gallery.pickers.minute"),
  periodLabel: t("gallery.pickers.period"),
}));

const quantityColumns = computed<WheelColumn[]>(() => [
  {
    key: "count",
    label: t("gallery.pickers.quantity"),
    align: "end",
    options: Array.from({ length: 100 }, (_, index) => ({
      value: index + 1,
      label: String(index + 1),
    })),
  },
  {
    key: "unit",
    label: t("gallery.pickers.unit"),
    align: "start",
    flex: 1.4,
    options: (["box", "pack", "pallet"] as const).map((unit) => ({
      value: unit,
      label: t(`gallery.pickers.units.${unit}`),
    })),
  },
]);

const formatted = (value: IsoDate) =>
  formatIso(value, locale.value, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
</script>
