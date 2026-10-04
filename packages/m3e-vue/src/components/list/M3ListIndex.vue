<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from "vue";
import { useHaptics } from "../../composables/services.js";
import { indexKeyAt } from "../../utils/listIndex.js";
import { scrollableAncestor } from "../../utils/scroll.js";

/**
 * Framework7's list index: the letters down the end edge of a grouped list. Touch or drag along
 * them and the list jumps to that `M3ListGroup` as the finger moves, with the letter shown large
 * beside the finger and a tick per letter. To the keyboard and to screen readers it is one
 * slider - the arrow keys step through the letters - rather than a tab stop per letter.
 *
 * It pins itself to the end edge between `--m3-list-index-top` and `--m3-list-index-bottom`; put it
 * outside the scroller (Framework7's `#fixed` page slot, `AppPage`'s `#fixed`), and keep the
 * content clear of it - about 24px at the end edge. It scrolls whichever of the page's
 * `.page-content` and the nearest scroller around it holds the groups.
 */
const props = defineProps<{ keys: readonly string[]; label: string }>();

const rail = useTemplateRef<HTMLElement>("rail");
const haptics = useHaptics();
const active = shallowRef<string | null>(null);
const bubbleTop = shallowRef(0);
const dragging = shallowRef(false);
const current = computed(() => active.value ?? props.keys[0] ?? "");

function jump(key: string) {
  const element = rail.value;
  if (!element) return;
  const selector = `[data-index-key="${CSS.escape(key)}"]`;
  const candidates = [
    element.closest(".page")?.querySelector<HTMLElement>(".page-content"),
    scrollableAncestor(element),
  ];
  const scroller = candidates.find((candidate) => candidate?.querySelector(selector)) ?? null;
  const group = scroller?.querySelector<HTMLElement>(selector);
  if (!scroller || !group) return;
  const title = group.firstElementChild as HTMLElement | null;
  const pinned = title ? Number.parseFloat(getComputedStyle(title).top) || 0 : 0;
  const offset = group.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  scroller.scrollTop += offset - pinned;
}

function select(key: string | null) {
  if (!key || key === active.value) return;
  active.value = key;
  haptics.tick();
  jump(key);
}

function at(event: PointerEvent) {
  const rect = rail.value?.getBoundingClientRect();
  if (!rect) return;
  bubbleTop.value = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
  select(indexKeyAt(event.clientY, rect.top, rect.height, props.keys));
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  rail.value?.setPointerCapture(event.pointerId);
  dragging.value = true;
  active.value = null;
  at(event);
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) at(event);
}

function onPointerUp() {
  dragging.value = false;
}

function onKeydown(event: KeyboardEvent) {
  const index = Math.max(0, props.keys.indexOf(current.value));
  const moves: Record<string, number> = {
    ArrowDown: index + 1,
    ArrowRight: index + 1,
    ArrowUp: index - 1,
    ArrowLeft: index - 1,
    Home: 0,
    End: props.keys.length - 1,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  select(props.keys[Math.min(props.keys.length - 1, Math.max(0, next))] ?? null);
}

onBeforeUnmount(() => (dragging.value = false));
</script>

<template>
  <div
    ref="rail"
    class="m3-list-index"
    :class="{ 'm3-list-index--dragging': dragging }"
    role="slider"
    tabindex="0"
    :aria-label="props.label"
    :aria-valuemin="0"
    :aria-valuemax="props.keys.length - 1"
    :aria-valuenow="Math.max(0, props.keys.indexOf(current))"
    :aria-valuetext="current"
    aria-orientation="vertical"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <span
      v-for="key in props.keys"
      :key="key"
      class="m3-list-index__key"
      :class="{ 'm3-list-index__key--active': key === active }"
      aria-hidden="true"
      >{{ key }}</span
    >
    <span
      v-if="dragging && active"
      class="m3-list-index__bubble"
      :style="{ top: `${bubbleTop}px` }"
      aria-hidden="true"
      >{{ active }}</span
    >
  </div>
</template>

<style scoped>
.m3-list-index {
  position: fixed;
  top: var(--m3-list-index-top, calc(env(safe-area-inset-top) + 72px));
  bottom: var(--m3-list-index-bottom, calc(env(safe-area-inset-bottom) + 8px));
  inset-inline-end: 2px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  width: 20px;
  border-radius: 10px;
  color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) / 1
    var(--md-sys-typescale-label-small-font);
  text-align: center;
  touch-action: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition: background-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-list-index--dragging,
.m3-list-index:focus-visible {
  background: var(--md-sys-color-surface-container-high);
}

.m3-list-index:focus-visible {
  outline: 2px solid var(--md-sys-color-secondary);
}

.m3-list-index__key {
  display: block;
  min-height: 0;
}

.m3-list-index__key--active {
  font-weight: 800;
}

.m3-list-index__bubble {
  position: absolute;
  inset-inline-end: 36px;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 28px 28px 4px 28px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font: var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) /
    1 var(--md-sys-typescale-headline-small-font);
  translate: 0 -50%;
  pointer-events: none;
}

:global([dir="rtl"] .m3-list-index__bubble) {
  border-radius: 28px 28px 28px 4px;
}
</style>
