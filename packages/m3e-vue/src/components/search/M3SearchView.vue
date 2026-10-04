<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useOverlay } from "../../composables/useOverlay.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { searchFrame, type Rect } from "../../utils/searchExpansion.js";

/**
 * Compose's search: a 56dp bar that opens into a full-screen search view. One spring progress
 * drives the whole transition - the surface grows out of the bar through a `clip-path` while its
 * corners go square, the header row slides from the bar to below the status bar, the search icon
 * turns into a back arrow, and the divider and results fade in - so nothing but that one row lays
 * out while it moves. It opens on the slow spatial spring and closes on the default one.
 *
 * The collapsed bar never raises the keyboard; tapping it focuses the open view's input inside the
 * same tap, which is what lets Android show the keyboard at once. The back arrow, Escape and
 * Android back close it. Results go in the default slot, which receives `{ query }`; `#trailing`
 * holds the collapsed bar's avatar or actions.
 *
 * @see https://m3.material.io/components/search/specs
 */
const props = withDefaults(
  defineProps<{
    placeholder: string;
    backLabel?: string;
    clearLabel?: string;
    teleport?: string | HTMLElement;
  }>(),
  { backLabel: "Back", clearLabel: "Clear", teleport: "body" },
);

const query = defineModel<string>({ default: "" });
const expanded = defineModel<boolean>("expanded", { default: false });
const emit = defineEmits<{ search: [query: string] }>();

const bar = useTemplateRef<HTMLElement>("bar");
const surface = useTemplateRef<HTMLElement>("surface");
const header = useTemplateRef<HTMLElement>("header");
const input = useTemplateRef<HTMLInputElement>("input");
const layer = useTemplateRef<HTMLElement>("layer");
const reduced = useReducedMotion();
const titleId = useId();
const visible = shallowRef(false);
const showContent = shallowRef(false);

const motion = MOTION_SCHEMES.expressive;
let progress = 0;
let animation: SpringAnimation | null = null;
let barRect: Rect = { left: 0, top: 0, width: 0, height: 56 };
let headerRestTop = 0;

const hasQuery = computed(() => query.value.length > 0);

const { layer: overlayLayer } = useOverlay({
  open: expanded,
  dismissible: true,
  onClose: () => (expanded.value = false),
});

function measure() {
  const rect = bar.value?.getBoundingClientRect();
  if (rect) barRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  const node = header.value;
  if (node) {
    const previous = node.style.transform;
    node.style.transform = "";
    headerRestTop = node.getBoundingClientRect().top;
    node.style.transform = previous;
  }
}

function apply(next: number) {
  progress = next;
  const frame = searchFrame(
    next,
    barRect,
    { width: window.innerWidth, height: window.innerHeight },
    { top: headerRestTop },
  );
  if (surface.value) surface.value.style.clipPath = frame.clip;
  if (header.value) {
    header.value.style.transform = `translate3d(${frame.headerX}px, ${frame.headerY}px, 0)`;
    header.value.style.width = `${frame.headerWidth}px`;
  }
  layer.value?.style.setProperty("--m3-search-reveal", frame.reveal.toFixed(3));
}

function animateTo(target: number): Promise<boolean> {
  animation?.stop();
  animation = animateSpring({
    from: progress,
    to: target,
    spring: target > progress ? motion.slowSpatial.spring : motion.defaultSpatial.spring,
    instant: reduced.value,
    restDelta: 0.001,
    onFrame: apply,
  });
  return animation.finished;
}

/** Shows the layer at the bar and focuses its input now, while the tap still counts as a gesture. */
function reveal() {
  visible.value = true;
  if (layer.value) {
    layer.value.inert = false;
    layer.value.classList.add("m3-search-view--visible");
  }
  measure();
  if (progress === 0) apply(0);
  input.value?.focus({ preventScroll: true });
}

function open() {
  if (expanded.value) return;
  reveal();
  expanded.value = true;
}

async function close() {
  input.value?.blur();
  showContent.value = progress > 0.5;
  if ((await animateTo(0)) && !expanded.value) {
    visible.value = false;
    showContent.value = false;
  }
}

watch(expanded, (value) => {
  if (value) {
    if (!visible.value) reveal();
    showContent.value = true;
    void animateTo(1);
  } else if (visible.value) {
    void close();
  }
});

function clear() {
  query.value = "";
  input.value?.focus();
}

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <div ref="bar" class="m3-search-view-bar" :class="{ 'm3-search-view-bar--hidden': visible }">
    <button
      v-ripple
      type="button"
      class="m3-search-view-bar__hit m3-state m3-focus-ring"
      :aria-expanded="expanded"
      @click="open"
    >
      <span class="m3-search-view-bar__icon" aria-hidden="true">
        <slot name="leading"><M3Glyph name="search" /></slot>
      </span>
      <span
        class="m3-search-view-bar__text"
        :class="{ 'm3-search-view-bar__text--placeholder': !hasQuery }"
        >{{ hasQuery ? query : props.placeholder }}</span
      >
    </button>
    <span v-if="$slots.trailing" class="m3-search-view-bar__trailing"
      ><slot name="trailing"
    /></span>
  </div>

  <Teleport :to="props.teleport">
    <div
      ref="layer"
      class="m3-search-view"
      :class="{ 'm3-search-view--visible': visible }"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-hidden="!visible || undefined"
      :inert="!visible"
      :style="overlayLayer"
    >
      <div ref="surface" class="m3-search-view__surface" />
      <form
        ref="header"
        class="m3-search-view__header"
        role="search"
        @submit.prevent="emit('search', query)"
      >
        <span class="m3-search-view__leading">
          <span class="m3-search-view__icon m3-search-view__icon--search" aria-hidden="true">
            <M3Glyph name="search" />
          </span>
          <button
            v-ripple
            type="button"
            class="m3-search-view__back m3-state m3-focus-ring"
            :aria-label="props.backLabel"
            @click="expanded = false"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7.825 13l5.6 5.6L12 20l-8-8l8-8l1.425 1.4l-5.6 5.6H20v2z" />
            </svg>
          </button>
        </span>
        <input
          :id="titleId"
          ref="input"
          v-model="query"
          class="m3-search-view__input"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          :placeholder="props.placeholder"
          :aria-label="props.placeholder"
          @keydown.esc.prevent="expanded = false"
        />
        <button
          v-if="hasQuery"
          v-ripple
          type="button"
          class="m3-search-view__clear m3-state m3-focus-ring"
          :aria-label="props.clearLabel"
          @click="clear"
        >
          <M3Glyph name="close" />
        </button>
      </form>
      <div class="m3-search-view__divider" aria-hidden="true" />
      <div class="m3-search-view__content">
        <slot v-if="showContent" :query="query" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.m3-search-view-bar {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 56px;
  padding-inline-end: 4px;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.m3-search-view-bar--hidden {
  visibility: hidden;
}

.m3-search-view-bar__hit {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
  min-width: 0;
  height: 100%;
  padding: 0 16px 0 4px;
  border: 0;
  border-radius: inherit;
  background: none;
  color: inherit;
  text-align: start;
  cursor: text;
}

.m3-search-view-bar__icon,
.m3-search-view-bar__trailing {
  display: grid;
  flex: none;
  place-items: center;
  min-width: 48px;
  height: 48px;
  color: var(--md-sys-color-on-surface);
}

.m3-search-view-bar__trailing {
  color: var(--md-sys-color-on-surface-variant);
}

.m3-search-view-bar__icon :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-search-view-bar__text {
  overflow: hidden;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  letter-spacing: var(--md-sys-typescale-body-large-tracking);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-search-view-bar__text--placeholder {
  color: var(--md-sys-color-on-surface-variant);
}

.m3-search-view {
  --m3-search-reveal: 0;
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  visibility: hidden;
  pointer-events: none;
}

.m3-search-view--visible {
  visibility: visible;
  pointer-events: auto;
}

.m3-search-view__surface {
  position: absolute;
  inset: 0;
  background: var(--md-sys-color-surface-container-high);
  will-change: clip-path;
}

.m3-search-view__header {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 8px);
  left: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  height: 56px;
  margin: 0;
  padding: 0 4px;
  color: var(--md-sys-color-on-surface);
  will-change: transform;
}

.m3-search-view__leading {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
}

.m3-search-view__icon,
.m3-search-view__back {
  grid-area: 1 / 1;
}

.m3-search-view__icon {
  display: grid;
  place-items: center;
  opacity: calc(1 - var(--m3-search-reveal));
}

.m3-search-view__icon :deep(svg),
.m3-search-view__back svg,
.m3-search-view__clear :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-search-view__back,
.m3-search-view__clear {
  display: grid;
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

.m3-search-view__back {
  opacity: var(--m3-search-reveal);
}

.m3-search-view__clear {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
}

.m3-search-view__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  caret-color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  letter-spacing: var(--md-sys-typescale-body-large-tracking);
  appearance: none;
}

.m3-search-view__input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
}

.m3-search-view__input::-webkit-search-cancel-button {
  appearance: none;
}

.m3-search-view__divider {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 72px);
  inset-inline: 0;
  height: 1px;
  background: var(--md-sys-color-outline);
  opacity: var(--m3-search-reveal);
}

.m3-search-view__content {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 73px);
  inset-inline: 0;
  bottom: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: env(safe-area-inset-bottom);
  color: var(--md-sys-color-on-surface);
  opacity: var(--m3-search-reveal);
}
</style>
