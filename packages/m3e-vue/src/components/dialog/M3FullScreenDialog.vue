<script setup lang="ts">
import M3Button from "../button/M3Button.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import M3IconButton from "../button/M3IconButton.vue";
import { shallowRef, useId, useTemplateRef } from "vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";

/**
 * The full-screen dialog - Framework7's popup in Material form - for a task that needs the whole
 * screen on a phone: a new order, an intake form, a multi-field edit. A close icon at the start, the
 * title, then optional action icons and the confirming text action at the end; the content scrolls
 * under the header, which takes the container colour once it does. On a phone it slides up from
 * the bottom; from 600dp wide it becomes a basic dialog over a scrim, as the guidelines ask.
 *
 * Closing (the icon, Escape, Android back) only closes - ask before discarding unsaved changes by
 * passing `dismissible: false` while dirty and confirming in your `@close` handler.
 *
 * @see https://m3.material.io/components/dialogs/guidelines#007536b9-76b1-474a-a152-2f340caaff6f
 */
const props = withDefaults(
  defineProps<{
    title: string;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    closeLabel?: string;
    dismissible?: boolean;
    teleport?: string | HTMLElement;
  }>(),
  { closeLabel: "Close", confirmDisabled: false, dismissible: true, teleport: "body" },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ confirm: []; close: []; closed: [] }>();
const panel = useTemplateRef<HTMLElement>("panel");
const settled = shallowRef(false);
const scrolled = shallowRef(false);
const titleId = useId();

function close() {
  emit("close");
  if (props.dismissible) open.value = false;
}

const { layer: overlayLayer } = useOverlay({ open, dismissible: () => true, onClose: close });
useFocusTrap(panel, settled);

function onScroll(event: Event) {
  scrolled.value = (event.target as HTMLElement).scrollTop > 0;
}

function onScrim() {
  close();
}
</script>

<template>
  <Teleport :to="props.teleport">
    <Transition
      name="m3-fullscreen-dialog"
      @after-enter="settled = true"
      @before-leave="settled = false"
      @after-leave="emit('closed')"
    >
      <div v-if="open" class="m3-fullscreen-dialog-layer" :style="overlayLayer">
        <div class="m3-fullscreen-dialog-layer__scrim" aria-hidden="true" @click="onScrim" />
        <section
          ref="panel"
          class="m3-fullscreen-dialog"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="titleId"
        >
          <header
            class="m3-fullscreen-dialog__header"
            :class="{ 'm3-fullscreen-dialog__header--scrolled': scrolled }"
          >
            <M3IconButton :label="props.closeLabel" @click="close">
              <M3Glyph name="close" />
            </M3IconButton>
            <h2 :id="titleId" class="m3-fullscreen-dialog__title">{{ props.title }}</h2>
            <span v-if="$slots.actions" class="m3-fullscreen-dialog__actions"
              ><slot name="actions"
            /></span>
            <M3Button
              v-if="props.confirmLabel"
              variant="text"
              :disabled="props.confirmDisabled"
              @click="emit('confirm')"
              >{{ props.confirmLabel }}</M3Button
            >
          </header>
          <div class="m3-fullscreen-dialog__body" @scroll.passive="onScroll"><slot /></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-fullscreen-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  display: grid;
  place-items: center;
}

.m3-fullscreen-dialog-layer__scrim {
  position: absolute;
  inset: 0;
  display: none;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
}

.m3-fullscreen-dialog {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.m3-fullscreen-dialog__header {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  min-height: calc(64px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 12px 0 4px;
  background: var(--md-sys-color-surface);
  transition: background-color var(--md-sys-motion-spring-default-effects-duration)
    var(--md-sys-motion-spring-default-effects);
}

.m3-fullscreen-dialog__header--scrolled {
  background: var(--md-sys-color-surface-container);
}

.m3-fullscreen-dialog__header :deep(.m3-icon-button svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-fullscreen-dialog__title {
  flex: 1;
  min-width: 0;
  margin: 0 0 0 4px;
  overflow: hidden;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-fullscreen-dialog__actions {
  display: flex;
  align-items: center;
}

.m3-fullscreen-dialog__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px 24px calc(24px + env(safe-area-inset-bottom));
}

@media (min-width: 600px) {
  .m3-fullscreen-dialog-layer {
    padding: 24px;
  }

  .m3-fullscreen-dialog-layer__scrim {
    display: block;
  }

  .m3-fullscreen-dialog {
    position: relative;
    inset: auto;
    width: 100%;
    max-width: 560px;
    max-height: min(90vh, 720px);
    overflow: hidden;
    border-radius: 28px;
    background: var(--md-sys-color-surface-container-high);
  }

  .m3-fullscreen-dialog__header {
    min-height: 64px;
    padding-top: 0;
    background: transparent;
  }

  .m3-fullscreen-dialog__header--scrolled {
    background: var(--md-sys-color-surface-container-highest);
  }

  .m3-fullscreen-dialog__body {
    padding-bottom: 24px;
  }
}

.m3-fullscreen-dialog-enter-active,
.m3-fullscreen-dialog-leave-active {
  transition: opacity var(--md-sys-motion-duration-long2);
}

.m3-fullscreen-dialog-enter-active .m3-fullscreen-dialog,
.m3-fullscreen-dialog-enter-active .m3-fullscreen-dialog-layer__scrim {
  transition:
    transform var(--md-sys-motion-duration-long2) var(--md-sys-motion-easing-emphasized-decelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.m3-fullscreen-dialog-leave-active .m3-fullscreen-dialog,
.m3-fullscreen-dialog-leave-active .m3-fullscreen-dialog-layer__scrim {
  transition:
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-fullscreen-dialog-enter-from .m3-fullscreen-dialog,
.m3-fullscreen-dialog-leave-to .m3-fullscreen-dialog {
  transform: translate3d(0, 100%, 0);
}

.m3-fullscreen-dialog-enter-from .m3-fullscreen-dialog-layer__scrim,
.m3-fullscreen-dialog-leave-to .m3-fullscreen-dialog-layer__scrim {
  opacity: 0;
}

@media (min-width: 600px) {
  .m3-fullscreen-dialog-enter-from .m3-fullscreen-dialog,
  .m3-fullscreen-dialog-leave-to .m3-fullscreen-dialog {
    opacity: 0;
    transform: scale(0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-fullscreen-dialog-enter-from .m3-fullscreen-dialog,
  .m3-fullscreen-dialog-leave-to .m3-fullscreen-dialog {
    opacity: 0;
    transform: none;
  }
}
</style>
