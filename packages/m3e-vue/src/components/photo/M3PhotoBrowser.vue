<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, nextTick, shallowRef, useTemplateRef, watch } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useElementSize } from "../../composables/useElementSize.js";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";
import { usePhotoGestures, type PhotoView } from "../../composables/usePhotoGestures.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { fitSize, type Size } from "../../utils/photoZoom.js";
import type { PhotoItem } from "./types.js";

/**
 * Framework7's photo browser in Material dress: photos full screen on black, swiped between,
 * pinched or double-tapped to zoom, panned when zoomed, and swiped up or down to close while the
 * black fades. A tap shows or hides the bar and the caption. Only the photo on screen and its
 * neighbours are loaded. Escape and Android back close it; the arrow keys page.
 *
 * Give `width` and `height` with each photo when they are known, so a photo is fitted before it
 * has loaded. The page behind keeps its status bar style - switch it to light icons while the
 * browser is open (`@update:open`) if the app draws edge to edge.
 */
const props = withDefaults(
  defineProps<{
    photos: readonly PhotoItem[];
    label: string;
    closeLabel?: string;
    counterText?: (position: number, count: number) => string;
    teleport?: string | HTMLElement;
  }>(),
  {
    closeLabel: "Close",
    counterText: (position: number, count: number) => `${position} / ${count}`,
    teleport: "body",
  },
);

const open = defineModel<boolean>("open", { default: false });
const index = defineModel<number>("index", { default: 0 });

const layer = useTemplateRef<HTMLElement>("layer");
const stage = useTemplateRef<HTMLElement>("stage");
const track = useTemplateRef<HTMLElement>("track");
const backdrop = useTemplateRef<HTMLElement>("backdrop");
const { width, height } = useElementSize(stage);
const reduced = useReducedMotion();
const current = shallowRef(0);
const chrome = shallowRef(true);
const naturals = shallowRef(new Map<number, Size>());
const frames: (HTMLElement | null)[] = [];
const GAP = 16;

const viewport = (): Size => ({ width: width.value || 1, height: height.value || 1 });
const photo = computed(() => props.photos[current.value]);

useOverlay({ open, dismissible: true, onClose: () => (open.value = false) });
useFocusTrap(layer, open);

function naturalOf(position: number): Size {
  const known = naturals.value.get(position);
  if (known) return known;
  const item = props.photos[position];
  return { width: item?.width ?? 0, height: item?.height ?? 0 };
}

function render(view: PhotoView) {
  const step = viewport().width + GAP;
  if (track.value) {
    track.value.style.transform = `translate3d(${-current.value * step + view.page}px, ${view.close}px, 0)`;
  }
  const frame = frames[current.value];
  if (frame) {
    frame.style.transform = `translate3d(${view.pan.x}px, ${view.pan.y}px, 0) scale(${view.scale})`;
  }
  const fade = 1 - Math.min(1, Math.abs(view.close) / (viewport().height / 2));
  if (backdrop.value) backdrop.value.style.opacity = String(fade);
  layer.value?.style.setProperty("--m3-photo-chrome", String(fade));
}

const gestures = usePhotoGestures({
  stage,
  enabled: () => open.value && props.photos.length > 0,
  index: () => current.value,
  count: () => props.photos.length,
  viewport,
  fit: () => fitSize(naturalOf(current.value), viewport()),
  gap: GAP,
  reduced: () => reduced.value,
  render,
  onPage(target) {
    const previous = frames[current.value];
    if (previous) previous.style.transform = "";
    current.value = target;
    index.value = target;
  },
  onClose: () => (open.value = false),
  onTap: () => (chrome.value = !chrome.value),
});

function setFrame(position: number, element: unknown) {
  frames[position] = element instanceof HTMLElement ? element : null;
}

function onLoad(position: number, event: Event) {
  const image = event.target as HTMLImageElement;
  const next = new Map(naturals.value);
  next.set(position, { width: image.naturalWidth, height: image.naturalHeight });
  naturals.value = next;
}

watch(open, async (value) => {
  if (!value) return;
  current.value = Math.min(Math.max(0, index.value), Math.max(0, props.photos.length - 1));
  chrome.value = true;
  await nextTick();
  frames.forEach((frame) => frame && (frame.style.transform = ""));
  gestures.reset();
  stage.value?.focus({ preventScroll: true });
});

watch(index, (value) => {
  if (!open.value || value === current.value) return;
  void gestures.turnPage(value, 0);
});

watch([width, height], () => {
  if (open.value) gestures.reset();
});
</script>

<template>
  <Teleport :to="props.teleport">
    <Transition name="m3-photo-browser">
      <div
        v-if="open"
        ref="layer"
        class="m3-photo-browser"
        :class="{ 'm3-photo-browser--bare': !chrome }"
        role="dialog"
        aria-modal="true"
        :aria-label="props.label"
        tabindex="-1"
      >
        <div ref="backdrop" class="m3-photo-browser__backdrop" aria-hidden="true" />
        <div
          ref="stage"
          class="m3-photo-browser__stage"
          tabindex="0"
          :aria-label="photo?.alt"
          aria-roledescription="photo"
        >
          <div ref="track" class="m3-photo-browser__track">
            <div
              v-for="(item, position) in props.photos"
              :key="position"
              class="m3-photo-browser__page"
              :style="{ transform: `translate3d(${position * (width + GAP)}px, 0, 0)` }"
              :aria-hidden="position !== current || undefined"
            >
              <div :ref="(element) => setFrame(position, element)" class="m3-photo-browser__frame">
                <img
                  v-if="Math.abs(position - current) <= 1"
                  class="m3-photo-browser__image"
                  :src="item.src"
                  :alt="item.alt"
                  :width="item.width"
                  :height="item.height"
                  decoding="async"
                  draggable="false"
                  @load="onLoad(position, $event)"
                />
              </div>
            </div>
          </div>
        </div>
        <header class="m3-photo-browser__bar">
          <button
            v-ripple
            type="button"
            class="m3-photo-browser__close m3-state m3-focus-ring"
            :aria-label="props.closeLabel"
            @click="open = false"
          >
            <M3Glyph name="close" />
          </button>
          <span class="m3-photo-browser__counter" aria-live="polite">{{
            props.counterText(current + 1, props.photos.length)
          }}</span>
          <span class="m3-photo-browser__actions"><slot name="actions" :photo="photo" /></span>
        </header>
        <p v-if="photo?.caption" class="m3-photo-browser__caption">{{ photo.caption }}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-photo-browser {
  --m3-photo-chrome: 1;
  position: fixed;
  inset: 0;
  z-index: calc(var(--m3-overlay-z, 12000) + 20);
  overflow: hidden;
  color: #fff;
  outline: none;
}

.m3-photo-browser__backdrop {
  position: absolute;
  inset: 0;
  background: #000;
}

.m3-photo-browser__stage {
  position: absolute;
  inset: 0;
  touch-action: none;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-photo-browser__track {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.m3-photo-browser__page {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.m3-photo-browser__frame {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  will-change: transform;
}

.m3-photo-browser__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  -webkit-user-drag: none;
  pointer-events: none;
}

.m3-photo-browser__bar,
.m3-photo-browser__caption {
  position: absolute;
  inset-inline: 0;
  opacity: var(--m3-photo-chrome);
  transition: translate var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-photo-browser__bar {
  top: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  height: calc(64px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 4px 0;
  background: linear-gradient(rgb(0 0 0 / 0.55), transparent);
}

.m3-photo-browser__caption {
  bottom: 0;
  margin: 0;
  padding: 32px 24px calc(24px + env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgb(0 0 0 / 0.6));
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-photo-browser--bare .m3-photo-browser__bar {
  translate: 0 -100%;
}

.m3-photo-browser--bare .m3-photo-browser__caption {
  translate: 0 100%;
}

.m3-photo-browser__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.m3-photo-browser__close :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-photo-browser__counter {
  flex: 1;
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
  font-variant-numeric: tabular-nums;
}

.m3-photo-browser__actions {
  display: flex;
  align-items: center;
}

.m3-photo-browser-enter-active,
.m3-photo-browser-leave-active {
  transition:
    opacity var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects),
    transform var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial);
}

.m3-photo-browser-enter-from,
.m3-photo-browser-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .m3-photo-browser-enter-from,
  .m3-photo-browser-leave-to {
    transform: none;
  }
}
</style>
