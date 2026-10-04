<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from "vue";
import M3DatePickerPanel from "./M3DatePickerPanel.vue";
import M3BottomSheet from "../sheet/M3BottomSheet.vue";
import M3Button from "../button/M3Button.vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";
import type { IsoDate } from "../../utils/calendar.js";
import type { DatePickerMode } from "./types.js";

/**
 * The modal date picker, as a centred dialog (Material's own) or a bottom sheet (Framework7's,
 * easier to reach one-handed). Both hold the headline, the chosen mode and Cancel / OK; the dialog
 * switches between calendar and typed input, the sheet between calendar and wheel, unless `modes`
 * says otherwise. Nothing is committed until OK - the picker edits a draft - so Cancel, the scrim,
 * a swipe down and Android back leave the value untouched.
 *
 * @see https://m3.material.io/components/date-pickers/specs
 */
const props = withDefaults(
  defineProps<{
    presentation?: "dialog" | "sheet";
    modes?: readonly DatePickerMode[];
    title?: string;
    emptyHeadline?: string;
    confirmLabel?: string;
    dismissLabel?: string;
    inputLabel?: string;
    calendarLabel?: string;
    wheelLabel?: string;
    invalidLabel?: string;
    min?: IsoDate;
    max?: IsoDate;
    locale?: string;
    isDisabled?: (date: IsoDate) => boolean;
    teleport?: string | HTMLElement;
  }>(),
  {
    presentation: "dialog",
    modes: undefined,
    title: "Select date",
    emptyHeadline: "Selected date",
    confirmLabel: "OK",
    dismissLabel: "Cancel",
    inputLabel: "Type a date",
    calendarLabel: "Switch to calendar",
    wheelLabel: "Switch to wheel",
    invalidLabel: "Invalid date",
    teleport: "body",
  },
);

const model = defineModel<IsoDate | null>({ default: null });
const open = defineModel<boolean>("open", { default: false });
const panel = useTemplateRef<HTMLElement>("panel");
const sheetPanel = useTemplateRef<InstanceType<typeof M3DatePickerPanel>>("sheetPanel");
const settled = shallowRef(false);
const draft = shallowRef<IsoDate | null>(null);
const session = shallowRef(0);
const titleId = useId();

const locale = computed(() => props.locale ?? (document.documentElement.lang || "en"));
const modes = computed<readonly DatePickerMode[]>(
  () =>
    props.modes ?? (props.presentation === "sheet" ? ["calendar", "wheel"] : ["calendar", "input"]),
);
const dialog = computed(() => props.presentation === "dialog");
const panelProps = computed(() => ({
  title: props.title,
  emptyHeadline: props.emptyHeadline,
  confirmLabel: props.confirmLabel,
  dismissLabel: props.dismissLabel,
  inputLabel: props.inputLabel,
  calendarLabel: props.calendarLabel,
  wheelLabel: props.wheelLabel,
  invalidLabel: props.invalidLabel,
  modes: modes.value,
  min: props.min,
  max: props.max,
  locale: locale.value,
  isDisabled: props.isDisabled,
}));

const { layer: overlayLayer } = useOverlay({
  open: computed(() => open.value && dialog.value),
  dismissible: true,
  onClose: () => (open.value = false),
});
useFocusTrap(panel, settled);

watch(
  open,
  (value) => {
    if (!value) return;
    draft.value = model.value;
    session.value += 1;
  },
  { immediate: true },
);

function confirm() {
  model.value = draft.value;
  open.value = false;
}
</script>

<template>
  <M3BottomSheet
    v-if="!dialog"
    v-model:open="open"
    :label="props.title"
    :teleport="props.teleport"
    :content-drag="false"
  >
    <M3DatePickerPanel
      ref="sheetPanel"
      :key="session"
      v-model:draft="draft"
      v-bind="panelProps"
      compact
      :actions="false"
      style="--m3-date-picker-container: var(--md-sys-color-surface-container-low)"
      @confirm="confirm"
      @dismiss="open = false"
    />
    <template #footer>
      <div class="m3-date-picker-sheet__actions">
        <M3Button variant="text" @click="open = false">{{ props.dismissLabel }}</M3Button>
        <M3Button variant="text" @click="sheetPanel?.confirm()">{{ props.confirmLabel }}</M3Button>
      </div>
    </template>
  </M3BottomSheet>
  <Teleport v-else :to="props.teleport">
    <Transition name="m3-picker" @after-enter="settled = true" @before-leave="settled = false">
      <div v-if="open" class="m3-picker-layer" :style="overlayLayer">
        <div class="m3-picker-layer__scrim" aria-hidden="true" @click="open = false" />
        <div
          ref="panel"
          class="m3-date-picker"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="titleId"
        >
          <M3DatePickerPanel
            :key="session"
            v-model:draft="draft"
            v-bind="panelProps"
            :title-id="titleId"
            @confirm="confirm"
            @dismiss="open = false"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-date-picker-sheet__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-inline: -12px;
}

.m3-picker-layer {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
}

.m3-picker-layer__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
}

.m3-date-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(360px, 100%);
  max-height: 100%;
  overflow: hidden;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.m3-picker-enter-active .m3-date-picker {
  transition:
    transform var(--md-sys-motion-duration-long2) var(--md-sys-motion-easing-emphasized-decelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.m3-picker-leave-active .m3-date-picker {
  transition:
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-picker-enter-active .m3-picker-layer__scrim,
.m3-picker-leave-active .m3-picker-layer__scrim {
  transition: opacity var(--md-sys-motion-duration-short4) linear;
}

.m3-picker-enter-active,
.m3-picker-leave-active {
  transition: opacity var(--md-sys-motion-duration-long2);
}

.m3-picker-enter-from .m3-date-picker,
.m3-picker-leave-to .m3-date-picker {
  opacity: 0;
  transform: scale(0.9);
}

.m3-picker-enter-from .m3-picker-layer__scrim,
.m3-picker-leave-to .m3-picker-layer__scrim {
  opacity: 0;
}
</style>
