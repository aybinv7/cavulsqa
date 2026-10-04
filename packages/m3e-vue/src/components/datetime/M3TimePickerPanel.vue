<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, shallowRef, useId, watch } from "vue";
import M3Button from "../button/M3Button.vue";
import M3ClockDial from "./M3ClockDial.vue";
import M3TimeWheel from "../picker/M3TimeWheel.vue";
import { vRipple } from "../../directives/ripple.js";
import type { GlyphName } from "../icon/glyphs.js";
import type { TimePickerMode } from "./types.js";
import { dayPeriodLabels, parseIsoTime, toIsoTime, type IsoTime } from "../../utils/time.js";

/**
 * What a time picker shows inside its dialog or sheet: the hour and minute selectors (96x80, in
 * `displayLarge`), the AM/PM selector on a twelve-hour clock, one of its `modes` - clock dial,
 * keyboard input, wheel - and the row with the mode switch, Cancel and OK. It edits
 * `v-model:draft` only; `confirm` fires once the draft is a valid time.
 *
 * @see https://m3.material.io/components/time-pickers/specs
 */
const props = defineProps<{
  titleId?: string;
  /** In a sheet the handle already spaces the top, so the panel drops its own top padding. */
  compact?: boolean;
  title: string;
  confirmLabel: string;
  dismissLabel: string;
  dialLabel: string;
  inputLabel: string;
  wheelLabel: string;
  hourLabel: string;
  minuteLabel: string;
  periodLabel: string;
  modes: readonly TimePickerMode[];
  hour24: boolean;
  minuteStep: number;
  locale: string;
}>();

const draft = defineModel<IsoTime>("draft", { required: true });
const emit = defineEmits<{ confirm: []; dismiss: [] }>();

const fallbackId = useId();
const titleId = computed(() => props.titleId ?? fallbackId);
const mode = shallowRef<TimePickerMode>(props.modes[0] ?? "dial");
const field = shallowRef<"hour" | "minute">("hour");

/** The draft as edited here, ahead of the round trip through the parent's `v-model`. */
const current = shallowRef(draft.value);
watch(draft, (value) => (current.value = value));

function commit(value: IsoTime) {
  current.value = value;
  draft.value = value;
}

const time = computed(() => parseIsoTime(current.value) ?? { hour: 0, minute: 0 });
const pm = computed(() => time.value.hour >= 12);
const periods = computed(() => dayPeriodLabels(props.locale));
const number = computed(
  () => new Intl.NumberFormat(props.locale, { minimumIntegerDigits: 2, useGrouping: false }),
);
const hourText = computed(() =>
  props.hour24
    ? number.value.format(time.value.hour)
    : String(time.value.hour % 12 === 0 ? 12 : time.value.hour % 12),
);
const minuteText = computed(() => number.value.format(time.value.minute));

const GLYPH: Record<TimePickerMode, GlyphName> = {
  dial: "clock",
  input: "keyboard",
  wheel: "wheel",
};
const next = computed<TimePickerMode>(() => {
  const index = props.modes.indexOf(mode.value);
  return props.modes[(index + 1) % props.modes.length] ?? "dial";
});
const nextLabel = computed(
  () => ({ dial: props.dialLabel, input: props.inputLabel, wheel: props.wheelLabel })[next.value],
);

const dialValue = computed({
  get: () => (field.value === "hour" ? time.value.hour : time.value.minute),
  set: (value: number) => {
    commit(
      field.value === "hour"
        ? toIsoTime(value, time.value.minute)
        : toIsoTime(time.value.hour, value),
    );
  },
});

function setPeriod(afternoon: boolean) {
  if (afternoon === pm.value) return;
  commit(toIsoTime((time.value.hour + 12) % 24, time.value.minute));
}

const typedHour = shallowRef("");
const typedMinute = shallowRef("");
const hourError = shallowRef(false);
const minuteError = shallowRef(false);

function startInput() {
  typedHour.value = hourText.value;
  typedMinute.value = minuteText.value;
  hourError.value = false;
  minuteError.value = false;
}

function onHourInput(text: string) {
  typedHour.value = text;
  const value = Number(text);
  const valid = /^\d{1,2}$/.test(text) && (props.hour24 ? value <= 23 : value >= 1 && value <= 12);
  hourError.value = !valid;
  if (!valid) return;
  const hour = props.hour24 ? value : (value % 12) + (pm.value ? 12 : 0);
  commit(toIsoTime(hour, time.value.minute));
}

function onMinuteInput(text: string) {
  typedMinute.value = text;
  const valid = /^\d{1,2}$/.test(text) && Number(text) <= 59;
  minuteError.value = !valid;
  if (valid) commit(toIsoTime(time.value.hour, Number(text)));
}

function cycle() {
  if (next.value === "input") startInput();
  if (next.value === "dial") field.value = "hour";
  mode.value = next.value;
}

function confirm() {
  if (mode.value === "input" && (hourError.value || minuteError.value)) return;
  emit("confirm");
}
</script>

<template>
  <div class="m3-time-picker-panel" :class="{ 'm3-time-picker-panel--compact': props.compact }">
    <span :id="titleId" class="m3-time-picker-panel__title">{{ props.title }}</span>

    <div v-if="mode !== 'wheel'" class="m3-time-picker-panel__display">
      <template v-if="mode === 'dial'">
        <button
          v-ripple
          type="button"
          class="m3-time-picker-panel__selector m3-state m3-focus-ring"
          :class="{ 'm3-time-picker-panel__selector--active': field === 'hour' }"
          :aria-label="props.hourLabel"
          :aria-pressed="field === 'hour'"
          @click="field = 'hour'"
        >
          {{ hourText }}
        </button>
        <span class="m3-time-picker-panel__separator" aria-hidden="true">:</span>
        <button
          v-ripple
          type="button"
          class="m3-time-picker-panel__selector m3-state m3-focus-ring"
          :class="{ 'm3-time-picker-panel__selector--active': field === 'minute' }"
          :aria-label="props.minuteLabel"
          :aria-pressed="field === 'minute'"
          @click="field = 'minute'"
        >
          {{ minuteText }}
        </button>
      </template>
      <template v-else>
        <label class="m3-time-picker-panel__field">
          <input
            class="m3-time-picker-panel__input"
            :class="{ 'm3-time-picker-panel__input--error': hourError }"
            :value="typedHour"
            inputmode="numeric"
            maxlength="2"
            autocomplete="off"
            :aria-invalid="hourError"
            @input="onHourInput(($event.target as HTMLInputElement).value)"
            @keydown.enter="confirm"
          />
          <span class="m3-time-picker-panel__supporting">{{ props.hourLabel }}</span>
        </label>
        <span class="m3-time-picker-panel__separator m3-time-picker-panel__separator--input"
          >:</span
        >
        <label class="m3-time-picker-panel__field">
          <input
            class="m3-time-picker-panel__input"
            :class="{ 'm3-time-picker-panel__input--error': minuteError }"
            :value="typedMinute"
            inputmode="numeric"
            maxlength="2"
            autocomplete="off"
            :aria-invalid="minuteError"
            @input="onMinuteInput(($event.target as HTMLInputElement).value)"
            @keydown.enter="confirm"
          />
          <span class="m3-time-picker-panel__supporting">{{ props.minuteLabel }}</span>
        </label>
      </template>
      <div
        v-if="!props.hour24"
        class="m3-time-picker-panel__period"
        :class="{ 'm3-time-picker-panel__period--input': mode === 'input' }"
        role="group"
        :aria-label="props.periodLabel"
      >
        <button
          v-for="(text, index) in periods"
          :key="text"
          v-ripple
          type="button"
          class="m3-time-picker-panel__period-option m3-state m3-focus-ring"
          :aria-pressed="(index === 1) === pm"
          @click="setPeriod(index === 1)"
        >
          {{ text }}
        </button>
      </div>
    </div>

    <div v-if="mode === 'dial'" class="m3-time-picker-panel__dial">
      <M3ClockDial
        v-model:value="dialValue"
        :mode="field"
        :hour24="props.hour24"
        :pm="pm"
        :locale="props.locale"
        :label="field === 'hour' ? props.hourLabel : props.minuteLabel"
        @release="field = 'minute'"
      />
    </div>
    <div v-else-if="mode === 'wheel'" class="m3-time-picker-panel__wheel">
      <M3TimeWheel
        v-model="draft"
        :locale="props.locale"
        :hour12="!props.hour24"
        :minute-step="props.minuteStep"
        :label="props.title"
        :labels="{ hour: props.hourLabel, minute: props.minuteLabel, period: props.periodLabel }"
      />
    </div>

    <footer class="m3-time-picker-panel__actions">
      <button
        v-if="props.modes.length > 1"
        v-ripple
        type="button"
        class="m3-time-picker-panel__mode m3-state m3-focus-ring"
        :aria-label="nextLabel"
        @click="cycle"
      >
        <M3Glyph :name="GLYPH[next]" />
      </button>
      <span class="m3-time-picker-panel__spacer" />
      <M3Button variant="text" @click="emit('dismiss')">{{ props.dismissLabel }}</M3Button>
      <M3Button variant="text" @click="confirm">{{ props.confirmLabel }}</M3Button>
    </footer>
  </div>
</template>

<style scoped>
.m3-time-picker-panel {
  display: flex;
  flex-direction: column;
  padding: 24px 24px 20px;
}

.m3-time-picker-panel--compact {
  padding-top: 0;
}

.m3-time-picker-panel--compact .m3-time-picker-panel__wheel {
  --m3-wheel-surface: var(--md-sys-color-surface-container-low);
}

.m3-time-picker-panel__title {
  margin-bottom: 20px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking);
}

.m3-time-picker-panel__display {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.m3-time-picker-panel__selector,
.m3-time-picker-panel__input {
  box-sizing: border-box;
  width: 96px;
  height: 80px;
  padding: 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-display-large-weight) var(--md-sys-typescale-display-large-size) /
    var(--md-sys-typescale-display-large-line-height) var(--md-sys-typescale-display-large-font);
  font-variant-numeric: tabular-nums;
  text-align: center;
  cursor: pointer;
}

.m3-time-picker-panel__selector--active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-time-picker-panel__separator {
  display: grid;
  place-items: center;
  width: 24px;
  height: 80px;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-display-large-weight) var(--md-sys-typescale-display-large-size) /
    var(--md-sys-typescale-display-large-line-height) var(--md-sys-typescale-display-large-font);
}

.m3-time-picker-panel__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.m3-time-picker-panel__input {
  height: 72px;
  font: var(--md-sys-typescale-display-medium-weight) var(--md-sys-typescale-display-medium-size) /
    var(--md-sys-typescale-display-medium-line-height) var(--md-sys-typescale-display-medium-font);
  outline: none;
  cursor: text;
  user-select: text;
}

.m3-time-picker-panel__input:focus {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}

.m3-time-picker-panel__input--error,
.m3-time-picker-panel__input--error:focus {
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-error);
}

.m3-time-picker-panel__separator--input {
  height: 72px;
}

.m3-time-picker-panel__supporting {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-time-picker-panel__period {
  display: flex;
  flex-direction: column;
  width: 52px;
  height: 80px;
  margin-inline-start: 12px;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-small);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
}

.m3-time-picker-panel__period--input {
  height: 72px;
}

.m3-time-picker-panel__period-option {
  flex: 1;
  padding: 0;
  border: 0;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
  cursor: pointer;
}

.m3-time-picker-panel__period-option + .m3-time-picker-panel__period-option {
  box-shadow: inset 0 1px 0 var(--md-sys-color-outline);
}

.m3-time-picker-panel__period-option[aria-pressed="true"] {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-time-picker-panel__dial {
  display: flex;
  justify-content: center;
  margin-block: 36px 24px;
}

.m3-time-picker-panel__wheel {
  --m3-wheel-surface: var(--md-sys-color-surface-container-high);
  margin-block: 8px 16px;
}

.m3-time-picker-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline: -12px -12px;
}

.m3-time-picker-panel__spacer {
  flex: 1;
}

.m3-time-picker-panel__mode {
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
</style>
