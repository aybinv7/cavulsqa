<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { shallowRef, useId, useTemplateRef } from "vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";

/**
 * The modal side sheet: secondary content or filters beside the main content on medium and larger
 * windows, sliding in from the end edge (or the start, for navigation) over a scrim. Its inner
 * corners are large (16dp); its outer edge stays flush with the screen. Escape, Android back and
 * the scrim close it. Slots: `header` (replaces the title row), default (scrolls), `footer`.
 *
 * @see https://m3.material.io/components/side-sheets/specs
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    side?: "start" | "end";
    width?: number;
    closeLabel?: string;
    dismissible?: boolean;
    label?: string;
    teleport?: string | HTMLElement;
  }>(),
  { side: "end", width: 360, closeLabel: "Close", dismissible: true, teleport: "body" },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ closed: [] }>();
const panel = useTemplateRef<HTMLElement>("panel");
const settled = shallowRef(false);
const titleId = useId();

useOverlay({ open, dismissible: () => props.dismissible, onClose: () => (open.value = false) });
useFocusTrap(panel, settled);
</script>

<template>
  <Teleport :to="props.teleport">
    <Transition
      name="m3-side-sheet"
      @after-enter="settled = true"
      @before-leave="settled = false"
      @after-leave="emit('closed')"
    >
      <div v-if="open" class="m3-side-sheet-layer" :class="`m3-side-sheet-layer--${props.side}`">
        <div
          class="m3-side-sheet-layer__scrim"
          aria-hidden="true"
          @click="props.dismissible && (open = false)"
        />
        <aside
          ref="panel"
          class="m3-side-sheet"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="props.title ? titleId : undefined"
          :aria-label="props.title ? undefined : props.label"
          :style="{
            width: `min(${Math.min(400, Math.max(256, props.width))}px, calc(100vw - 56px))`,
          }"
        >
          <header v-if="props.title || $slots.header" class="m3-side-sheet__header">
            <slot name="header">
              <h2 :id="titleId" class="m3-side-sheet__title">{{ props.title }}</h2>
              <button
                v-if="props.dismissible"
                type="button"
                class="m3-side-sheet__close m3-state m3-focus-ring"
                :aria-label="props.closeLabel"
                @click="open = false"
              >
                <M3Glyph name="close" />
              </button>
            </slot>
          </header>
          <div class="m3-side-sheet__body"><slot /></div>
          <footer v-if="$slots.footer" class="m3-side-sheet__footer"><slot name="footer" /></footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-side-sheet-layer {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  display: flex;
  justify-content: flex-end;
}

.m3-side-sheet-layer--start {
  justify-content: flex-start;
}

.m3-side-sheet-layer__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
}

.m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level1);
  outline: none;
}

.m3-side-sheet-layer--end .m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  border-start-start-radius: 16px;
  border-end-start-radius: 16px;
}

.m3-side-sheet-layer--start .m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  border-start-end-radius: 16px;
  border-end-end-radius: 16px;
}

.m3-side-sheet__header {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 12px 12px 8px 24px;
}

.m3-side-sheet__title {
  flex: 1;
  margin: 0;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
}

.m3-side-sheet__close {
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

.m3-side-sheet__close svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-side-sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.m3-side-sheet__footer {
  flex: none;
  padding: 16px 24px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.m3-side-sheet-enter-active .m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  transition: transform var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-side-sheet-leave-active .m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  transition: transform var(--md-sys-motion-duration-short4)
    var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-side-sheet-enter-active .m3-side-sheet-layer__scrim,
.m3-side-sheet-leave-active .m3-side-sheet-layer__scrim {
  transition: opacity var(--md-sys-motion-spring-default-effects-duration)
    var(--md-sys-motion-spring-default-effects);
}

.m3-side-sheet-enter-active,
.m3-side-sheet-leave-active {
  transition: opacity var(--md-sys-motion-spring-default-spatial-duration);
}

.m3-side-sheet-enter-from .m3-side-sheet-layer__scrim,
.m3-side-sheet-leave-to .m3-side-sheet-layer__scrim {
  opacity: 0;
}

.m3-side-sheet-layer--end.m3-side-sheet-enter-from .m3-side-sheet,
.m3-side-sheet-layer--end.m3-side-sheet-leave-to .m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  transform: translateX(calc(100% + 16px));
}

.m3-side-sheet-layer--start.m3-side-sheet-enter-from .m3-side-sheet,
.m3-side-sheet-layer--start.m3-side-sheet-leave-to .m3-side-sheet {
  --m3-segmented-container: var(--md-sys-color-surface-container);
  transform: translateX(calc(-100% - 16px));
}

:global([dir="rtl"] .m3-side-sheet-layer--end.m3-side-sheet-enter-from .m3-side-sheet),
:global([dir="rtl"] .m3-side-sheet-layer--end.m3-side-sheet-leave-to .m3-side-sheet) {
  transform: translateX(calc(-100% - 16px));
}

:global([dir="rtl"] .m3-side-sheet-layer--start.m3-side-sheet-enter-from .m3-side-sheet),
:global([dir="rtl"] .m3-side-sheet-layer--start.m3-side-sheet-leave-to .m3-side-sheet) {
  transform: translateX(calc(100% + 16px));
}
</style>
