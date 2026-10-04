<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from "vue";
import M3TimePickerPanel from "./M3TimePickerPanel.vue";
import M3BottomSheet from "../sheet/M3BottomSheet.vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";
import {
  parseIsoTime,
  snapIsoTime,
  toIsoTime,
  uses12Hour,
  type IsoTime,
} from "../../utils/time.js";
import type { TimePickerMode } from "./types.js";

/**
 * The modal time picker, as a centred dialog (Material's own) or a bottom sheet (Framework7's).
 * The dialog switches between the clock dial and keyboard input, the sheet between the dial and a
 * wheel, unless `modes` says otherwise. `v-model` is `HH:mm` on the 24-hour clock; the clock face
 * follows the locale unless `hour12` is set. Nothing is committed until OK.
 *
 * @see https://m3.material.io/components/time-pickers/specs
 * @see https://m3.material.io/components/time-pickers/guidelines
 */
const props = withDefaults(
  defineProps<{
    presentation?: "dialog" | "sheet";
    modes?: readonly TimePickerMode[];
    hour12?: boolean;
    minuteStep?: number;
    title?: string;
    confirmLabel?: string;
    dismissLabel?: string;
    dialLabel?: string;
    inputLabel?: string;
    wheelLabel?: string;
    hourLabel?: string;
    minuteLabel?: string;
    periodLabel?: string;
    locale?: string;
    teleport?: string | HTMLElement;
  }>(),
  {
    presentation: "dialog",
    modes: undefined,
    hour12: undefined,
    minuteStep: 1,
    title: "Select time",
    confirmLabel: "OK",
    dismissLabel: "Cancel",
    dialLabel: "Switch to clock",
    inputLabel: "Switch to keyboard",
    wheelLabel: "Switch to wheel",
    hourLabel: "Hour",
    minuteLabel: "Minute",
    periodLabel: "AM or PM",
    teleport: "body",
  },
);

const model = defineModel<IsoTime | null>({ default: null });
const open = defineModel<boolean>("open", { default: false });
const panel = useTemplateRef<HTMLElement>("panel");
const settled = shallowRef(false);
const draft = shallowRef<IsoTime>("00:00");
const session = shallowRef(0);
const titleId = useId();

const locale = computed(() => props.locale ?? (document.documentElement.lang || "en"));
const modes = computed<readonly TimePickerMode[]>(
  () => props.modes ?? (props.presentation === "sheet" ? ["dial", "wheel"] : ["dial", "input"]),
);
const dialog = computed(() => props.presentation === "dialog");
const panelProps = computed(() => ({
  title: props.title,
  confirmLabel: props.confirmLabel,
  dismissLabel: props.dismissLabel,
  dialLabel: props.dialLabel,
  inputLabel: props.inputLabel,
  wheelLabel: props.wheelLabel,
  hourLabel: props.hourLabel,
  minuteLabel: props.minuteLabel,
  periodLabel: props.periodLabel,
  modes: modes.value,
  hour24: props.hour12 === undefined ? !uses12Hour(locale.value) : !props.hour12,
  minuteStep: Math.max(1, Math.floor(props.minuteStep)),
  locale: locale.value,
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
    const now = new Date();
    draft.value = parseIsoTime(model.value)
      ? model.value!
      : snapIsoTime(toIsoTime(now.getHours(), now.getMinutes()), props.minuteStep);
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
    <M3TimePickerPanel
      :key="session"
      v-model:draft="draft"
      v-bind="panelProps"
      compact
      @confirm="confirm"
      @dismiss="open = false"
    />
  </M3BottomSheet>
  <Teleport v-else :to="props.teleport">
    <Transition name="m3-picker" @after-enter="settled = true" @before-leave="settled = false">
      <div v-if="open" class="m3-picker-layer" :style="overlayLayer">
        <div class="m3-picker-layer__scrim" aria-hidden="true" @click="open = false" />
        <div
          ref="panel"
          class="m3-time-picker"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="titleId"
        >
          <M3TimePickerPanel
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

.m3-time-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.m3-picker-enter-active .m3-time-picker {
  transition:
    transform var(--md-sys-motion-duration-long2) var(--md-sys-motion-easing-emphasized-decelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.m3-picker-leave-active .m3-time-picker {
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

.m3-picker-enter-from .m3-time-picker,
.m3-picker-leave-to .m3-time-picker {
  opacity: 0;
  transform: scale(0.9);
}

.m3-picker-enter-from .m3-picker-layer__scrim,
.m3-picker-leave-to .m3-picker-layer__scrim {
  opacity: 0;
}
</style>
