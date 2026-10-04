<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import M3IconButton from "../button/M3IconButton.vue";
import { computed, onBeforeUnmount, useTemplateRef, watch } from "vue";
import { useElementSize } from "../../composables/useElementSize.js";

/**
 * Framework7's messagebar: the composer under a conversation. The field grows with what is typed up
 * to `maxRows`, then scrolls. Send is a filled icon button that keeps the keyboard up - the field
 * keeps focus through the tap, as in any messaging app. With an `#idle` slot (a voice button, say)
 * that slot stands in for send while the field is empty. `#leading` sits before the field (attach)
 * and `#trailing` inside it (emoji, camera). `enterSends` makes Enter send and Shift+Enter break the
 * line, for hardware keyboards; on a phone Enter breaks the line.
 *
 * It pins itself to the bottom edge of its parent - Framework7's `#fixed` page slot, `AppPage`'s
 * `#fixed` - and publishes its height there as `--m3-message-bar-height`, which `M3Messages` keeps
 * clear. `--m3-message-bar-inset` (the bottom safe area by default) pads it above the gesture bar.
 * It is marked `data-keeps-keyboard` for a tap-outside handler to leave the keyboard alone.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    sendLabel?: string;
    maxRows?: number;
    maxlength?: number;
    disabled?: boolean;
    enterSends?: boolean;
  }>(),
  { sendLabel: "Send", maxRows: 6, disabled: false, enterSends: false },
);

const model = defineModel<string>({ default: "" });
const emit = defineEmits<{ send: [text: string] }>();
const slots = defineSlots<{
  leading?: () => unknown;
  trailing?: () => unknown;
  idle?: () => unknown;
}>();

const root = useTemplateRef<HTMLElement>("root");
const input = useTemplateRef<HTMLTextAreaElement>("input");
const { height } = useElementSize(root);
const ready = computed(() => model.value.trim().length > 0 && !props.disabled);
const sizesItself = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");
let host: HTMLElement | null = null;

function grow() {
  const element = input.value;
  if (!element || sizesItself) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function send() {
  const text = model.value.trim();
  if (!text || props.disabled) return;
  emit("send", text);
  model.value = "";
  const element = input.value;
  if (element && document.activeElement !== element) element.focus({ preventScroll: true });
}

function onKeydown(event: KeyboardEvent) {
  if (!props.enterSends || event.key !== "Enter" || event.shiftKey) return;
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  send();
}

watch(model, grow, { flush: "post" });

watch(height, (value) => {
  host ??= root.value?.parentElement ?? null;
  host?.style.setProperty("--m3-message-bar-height", `${value}px`);
});

onBeforeUnmount(() => host?.style.removeProperty("--m3-message-bar-height"));

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <div
    ref="root"
    class="m3-message-bar"
    :style="{ '--m3-message-bar-rows': props.maxRows }"
    data-keeps-keyboard
  >
    <div v-if="slots.leading" class="m3-message-bar__side"><slot name="leading" /></div>
    <div
      class="m3-message-bar__field"
      :class="{ 'm3-message-bar__field--disabled': props.disabled }"
    >
      <textarea
        ref="input"
        v-model="model"
        class="m3-message-bar__input"
        rows="1"
        :aria-label="props.label"
        :placeholder="props.placeholder ?? props.label"
        :maxlength="props.maxlength"
        :disabled="props.disabled"
        :enterkeyhint="props.enterSends ? 'send' : 'enter'"
        autocapitalize="sentences"
        @keydown="onKeydown"
      />
      <div v-if="slots.trailing" class="m3-message-bar__trailing"><slot name="trailing" /></div>
    </div>
    <div class="m3-message-bar__side">
      <Transition name="m3-message-bar-swap" mode="out-in">
        <M3IconButton
          v-if="ready || !slots.idle"
          key="send"
          variant="filled"
          size="m"
          :label="props.sendLabel"
          :disabled="!ready"
          @pointerdown.prevent
          @click="send"
        >
          <M3Glyph name="send" class="m3-message-bar__send" />
        </M3IconButton>
        <div v-else key="idle" class="m3-message-bar__idle"><slot name="idle" /></div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.m3-message-bar {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px calc(8px + var(--m3-message-bar-inset, env(safe-area-inset-bottom)));
  background: var(--md-sys-color-surface);
}

.m3-message-bar__side {
  display: flex;
  align-items: center;
  min-height: 56px;
}

.m3-message-bar__field {
  display: flex;
  flex: 1;
  align-items: flex-end;
  min-width: 0;
  min-height: 56px;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  transition: background-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-message-bar__field:focus-within {
  background: var(--md-sys-color-surface-container-highest);
}

.m3-message-bar__field--disabled {
  opacity: 0.38;
}

.m3-message-bar__input {
  flex: 1;
  box-sizing: border-box;
  min-width: 0;
  min-height: 56px;
  max-height: calc(var(--m3-message-bar-rows) * 24px + 32px);
  margin: 0;
  padding: 16px 20px;
  border: 0;
  outline: none;
  overflow-y: auto;
  resize: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  caret-color: var(--md-sys-color-primary);
  field-sizing: content;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) / 24px
    var(--md-sys-typescale-body-large-font);
  letter-spacing: var(--md-sys-typescale-body-large-tracking);
}

.m3-message-bar__input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
  opacity: 1;
}

.m3-message-bar__trailing {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding-inline-end: 8px;
}

:global([dir="rtl"] .m3-message-bar__send) {
  transform: scaleX(-1);
}

.m3-message-bar__idle {
  display: flex;
}

.m3-message-bar-swap-enter-active,
.m3-message-bar-swap-leave-active {
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-message-bar-swap-enter-from,
.m3-message-bar-swap-leave-to {
  opacity: 0;
  transform: scale(0.6) rotate(-30deg);
}
</style>
