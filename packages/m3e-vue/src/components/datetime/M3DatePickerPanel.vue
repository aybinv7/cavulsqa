<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, shallowRef, useId, watch } from "vue";
import M3Calendar from "./M3Calendar.vue";
import M3Button from "../button/M3Button.vue";
import M3TextField from "../textfield/M3TextField.vue";
import M3DateWheel from "../picker/M3DateWheel.vue";
import { vRipple } from "../../directives/ripple.js";
import type { GlyphName } from "../icon/glyphs.js";
import type { DatePickerMode } from "./types.js";
import {
  datePattern,
  formatIso,
  formatLocalDate,
  parseLocalDate,
  type IsoDate,
} from "../../utils/calendar.js";

/**
 * What a date picker shows inside its dialog or sheet: the headline with the drafted date, one of
 * its `modes` - calendar grid, typed input, wheel - with a button cycling to the next, and the
 * Cancel / OK row. It edits `v-model:draft` only; `confirm` fires once the draft is valid.
 *
 * `compact` folds the title and headline into one short block for a sheet, where the handle already
 * takes the top; `actions: false` leaves Cancel / OK to the container - a sheet pins them in its
 * footer and calls the exposed `confirm()`, so they never scroll out of reach.
 */
const props = withDefaults(
  defineProps<{
    titleId?: string;
    title: string;
    emptyHeadline: string;
    confirmLabel: string;
    dismissLabel: string;
    inputLabel: string;
    calendarLabel: string;
    wheelLabel: string;
    invalidLabel: string;
    modes: readonly DatePickerMode[];
    min?: IsoDate;
    max?: IsoDate;
    locale: string;
    isDisabled?: (date: IsoDate) => boolean;
    compact?: boolean;
    actions?: boolean;
  }>(),
  { titleId: undefined, compact: false, actions: true },
);

const draft = defineModel<IsoDate | null>("draft", { default: null });
const emit = defineEmits<{ confirm: []; dismiss: [] }>();

const fallbackId = useId();
const titleId = computed(() => props.titleId ?? fallbackId);
const mode = shallowRef<DatePickerMode>(props.modes[0] ?? "calendar");
const typed = shallowRef(draft.value ? formatLocalDate(draft.value, props.locale) : "");

const GLYPH: Record<DatePickerMode, GlyphName> = {
  calendar: "calendar",
  input: "edit",
  wheel: "wheel",
};
const next = computed<DatePickerMode>(() => {
  const index = props.modes.indexOf(mode.value);
  return props.modes[(index + 1) % props.modes.length] ?? "calendar";
});
const nextLabel = computed(
  () =>
    ({ calendar: props.calendarLabel, input: props.inputLabel, wheel: props.wheelLabel })[
      next.value
    ],
);

const headline = computed(() =>
  draft.value
    ? formatIso(draft.value, props.locale, { weekday: "short", month: "short", day: "numeric" })
    : props.emptyHeadline,
);

const typedValue = computed(() => parseLocalDate(typed.value, props.locale));
const typedError = computed(() => {
  if (!typed.value.trim()) return undefined;
  const value = typedValue.value;
  if (
    !value ||
    (props.min && value < props.min) ||
    (props.max && value > props.max) ||
    props.isDisabled?.(value)
  )
    return props.invalidLabel;
  return undefined;
});

watch(typedValue, (value) => {
  if (mode.value === "input" && value && !typedError.value) draft.value = value;
});

function cycle() {
  if (next.value === "input")
    typed.value = draft.value ? formatLocalDate(draft.value, props.locale) : "";
  mode.value = next.value;
}

function confirm() {
  if (mode.value === "input" && typed.value.trim() && typedError.value) return;
  emit("confirm");
}

defineExpose({ confirm });
</script>

<template>
  <div class="m3-date-picker-panel" :class="{ 'm3-date-picker-panel--compact': props.compact }">
    <header class="m3-date-picker-panel__header">
      <span :id="titleId" class="m3-date-picker-panel__title">{{ props.title }}</span>
      <div class="m3-date-picker-panel__headline-row">
        <span class="m3-date-picker-panel__headline" aria-live="polite">{{ headline }}</span>
        <button
          v-if="props.modes.length > 1"
          v-ripple
          type="button"
          class="m3-date-picker-panel__mode m3-state m3-focus-ring"
          :aria-label="nextLabel"
          @click="cycle"
        >
          <M3Glyph :name="GLYPH[next]" />
        </button>
      </div>
    </header>
    <div class="m3-date-picker-panel__divider" />
    <div class="m3-date-picker-panel__body">
      <M3Calendar
        v-if="mode === 'calendar'"
        v-model:value="draft"
        :min="props.min"
        :max="props.max"
        :locale="props.locale"
        :is-disabled="props.isDisabled"
      />
      <div v-else-if="mode === 'wheel'" class="m3-date-picker-panel__wheel">
        <M3DateWheel
          v-model="draft"
          :min="props.min"
          :max="props.max"
          :locale="props.locale"
          :label="props.title"
        />
      </div>
      <div v-else class="m3-date-picker-panel__input">
        <M3TextField
          v-model="typed"
          variant="outlined"
          :label="props.inputLabel"
          :supporting="datePattern(props.locale)"
          :error="typedError"
          inputmode="numeric"
          autocomplete="off"
          @keydown.enter="confirm"
        />
      </div>
    </div>
    <footer v-if="props.actions" class="m3-date-picker-panel__actions">
      <M3Button variant="text" @click="emit('dismiss')">{{ props.dismissLabel }}</M3Button>
      <M3Button variant="text" @click="confirm">{{ props.confirmLabel }}</M3Button>
    </footer>
  </div>
</template>

<style scoped>
.m3-date-picker-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  --m3-text-field-notch: var(
    --m3-date-picker-container,
    var(--md-sys-color-surface-container-high)
  );
}

.m3-date-picker-panel__header {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding: 16px 12px 12px 24px;
}

.m3-date-picker-panel__title {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
}

.m3-date-picker-panel__headline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.m3-date-picker-panel__headline {
  font: var(--md-sys-typescale-headline-large-weight) var(--md-sys-typescale-headline-large-size) /
    var(--md-sys-typescale-headline-large-line-height) var(--md-sys-typescale-headline-large-font);
}

.m3-date-picker-panel__mode {
  display: grid;
  flex: none;
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

.m3-date-picker-panel__divider {
  height: 1px;
  background: var(--md-sys-color-outline-variant);
}

.m3-date-picker-panel--compact .m3-date-picker-panel__header {
  gap: 4px;
  padding: 0 12px 8px 24px;
}

.m3-date-picker-panel--compact .m3-date-picker-panel__headline {
  font: var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) /
    var(--md-sys-typescale-headline-small-line-height) var(--md-sys-typescale-headline-small-font);
}

.m3-date-picker-panel__body {
  min-height: 0;
  overflow-y: auto;
  padding-top: 8px;
}

.m3-date-picker-panel__wheel {
  --m3-wheel-surface: var(--m3-date-picker-container, var(--md-sys-color-surface-container-high));
  padding-block: 16px 8px;
}

.m3-date-picker-panel__input {
  padding: 16px 24px 8px;
}

.m3-date-picker-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 12px;
}
</style>
