<template>
  <M3BottomSheet v-model:open="open" :title="t('gallery.chat.invite.title')">
    <div class="flex flex-col gap-3 px-4 pb-2">
      <M3TextField
        v-model="title"
        :label="t('gallery.chat.invite.name')"
        :maxlength="TITLE_MAX"
        autocomplete="off"
      />
      <M3List variant="segmented">
        <M3ListItem
          clickable
          :overline="t('gallery.chat.invite.date')"
          :headline="dateLabel"
          @click="dateOpen = true"
        >
          <template #leading><i-ms-calendar-today-outline-rounded /></template>
        </M3ListItem>
        <M3ListItem
          clickable
          :overline="t('gallery.chat.invite.time')"
          :headline="timeLabel"
          @click="timeOpen = true"
        >
          <template #leading><i-ms-schedule-outline-rounded /></template>
        </M3ListItem>
      </M3List>
      <M3TextField
        v-model="place"
        :label="t('gallery.chat.invite.place')"
        :maxlength="PLACE_MAX"
        autocomplete="off"
      />
    </div>

    <template #footer>
      <div class="flex justify-end">
        <M3Button size="m" :disabled="!ready" @click="submit">
          <template #icon><i-ms-send-rounded class="rtl:-scale-x-100" /></template>
          {{ t("gallery.chat.send") }}
        </M3Button>
      </div>
    </template>
  </M3BottomSheet>

  <M3DatePicker
    v-model="date"
    v-model:open="dateOpen"
    :min="today"
    :locale="locale"
    :title="t('gallery.pickers.selectDate')"
    :empty-headline="t('gallery.pickers.selectedDate')"
    :confirm-label="t('gallery.pickers.ok')"
    :dismiss-label="t('gallery.overlays.cancel')"
    :input-label="t('gallery.pickers.typeDate')"
    :calendar-label="t('gallery.pickers.useCalendar')"
    :invalid-label="t('gallery.pickers.invalid')"
  />
  <M3TimePicker
    v-model="time"
    v-model:open="timeOpen"
    :minute-step="15"
    :locale="locale"
    :title="t('gallery.pickers.selectTime')"
    :confirm-label="t('gallery.pickers.ok')"
    :dismiss-label="t('gallery.overlays.cancel')"
    :dial-label="t('gallery.pickers.useDial')"
    :input-label="t('gallery.pickers.useKeyboard')"
  />
</template>

<script setup lang="ts">
import {
  addDays,
  formatIso,
  formatIsoTime,
  todayIso,
  type IsoDate,
  type IsoTime,
  type MessageInvite,
} from "@cavulsqa/m3e-vue";

const TITLE_MAX = 80;
const PLACE_MAX = 80;
const DEFAULT_TIME: IsoTime = "09:00";

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ send: [invite: MessageInvite] }>();
const { t, locale } = useI18n();

const today = todayIso();
const title = ref("");
const place = ref("");
const date = ref<IsoDate | null>(addDays(today, 1));
const time = ref<IsoTime | null>(DEFAULT_TIME);
const dateOpen = ref(false);
const timeOpen = ref(false);

const dateLabel = computed(() =>
  date.value
    ? formatIso(date.value, locale.value, { weekday: "long", day: "numeric", month: "long" })
    : t("gallery.pickers.pick"),
);
const timeLabel = computed(() =>
  time.value ? formatIsoTime(time.value, locale.value) : t("gallery.pickers.pickTime"),
);

const start = computed(() => {
  if (!date.value || !time.value) return null;
  const at = new Date(`${date.value}T${time.value}:00`);
  return Number.isNaN(at.getTime()) ? null : at;
});

const ready = computed(() => Boolean(title.value.trim()) && start.value !== null);

function submit() {
  if (!ready.value || !start.value) return;
  const where = place.value.trim();
  emit("send", {
    title: title.value.trim(),
    start: start.value,
    ...(where ? { place: where } : {}),
    answers: { going: 0, maybe: 0, no: 0 },
  });
  title.value = "";
  place.value = "";
  date.value = addDays(todayIso(), 1);
  time.value = DEFAULT_TIME;
  open.value = false;
}
</script>
