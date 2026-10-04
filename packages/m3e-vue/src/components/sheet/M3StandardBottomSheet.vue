<script setup lang="ts">
import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from "vue";
import { useDetentGesture } from "../../composables/useDetentGesture.js";
import { useElementSize } from "../../composables/useElementSize.js";
import { useHaptics } from "../../composables/services.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import {
  detentAnchors,
  offsetOf,
  settleDetent,
  type DetentAnchor,
  type SheetDetent,
} from "../../utils/detents.js";

/**
 * Compose's standard bottom sheet: it lives beside the content rather than over a scrim, peeking at
 * the bottom edge, and drags between `peek`, `half` and `expanded` (and `hidden` when `hideable`).
 * Until it is fully open a drag anywhere on it moves the sheet; once open, the content scrolls, and
 * dragging down from the content's top brings the sheet down again. A release settles as Compose's
 * does - a fling goes to the next detent, a slow release moves on after 56dp. The drag handle is a
 * button that steps up through the detents, and back to the peek from the top.
 *
 * It is fixed to the window. Set `--m3-standard-sheet-inset-bottom` to sit it above a navigation
 * bar, and pad the content beneath it by the peek so nothing hides under the sheet.
 *
 * @see https://m3.material.io/components/bottom-sheets/specs
 */
const props = withDefaults(
  defineProps<{
    label: string;
    title?: string;
    peekHeight?: number;
    half?: boolean;
    hideable?: boolean;
    expandLabel?: string;
    collapseLabel?: string;
  }>(),
  {
    peekHeight: 56,
    half: true,
    hideable: false,
    expandLabel: "Expand",
    collapseLabel: "Collapse",
  },
);

const detent = defineModel<SheetDetent>("detent", { default: "peek" });

const frame = useTemplateRef<HTMLElement>("frame");
const sheet = useTemplateRef<HTMLElement>("sheet");
const { height: available } = useElementSize(frame);
const { height: sheetHeight } = useElementSize(sheet);
const reduced = useReducedMotion();
const haptics = useHaptics();
const titleId = useId();
const spring = MOTION_SCHEMES.expressive.defaultSpatial.spring;

const settledHidden = shallowRef(detent.value === "hidden");
let offset = Number.NaN;
let animation: SpringAnimation | null = null;
let animating = false;
let lastAnchor: DetentAnchor | null = null;

const bottomPadding = () =>
  sheet.value ? Number.parseFloat(getComputedStyle(sheet.value).paddingBottom) || 0 : 0;

const anchors = computed(() =>
  detentAnchors({
    sheetHeight: sheetHeight.value,
    available: available.value,
    peekVisible: props.peekHeight + bottomPadding(),
    half: props.half,
    hideable: props.hideable,
  }),
);

const expanded = computed(() => detent.value === "expanded");

function indexOfCurrent(list: readonly DetentAnchor[]): number {
  const current = offsetOf(detent.value, list).detent;
  return list.findIndex((anchor) => anchor.detent === current);
}

function place(y: number) {
  offset = y;
  if (sheet.value) sheet.value.style.transform = `translate3d(0, ${y}px, 0)`;
}

function nearestAnchor(y: number): DetentAnchor {
  return anchors.value.reduce((best, anchor) =>
    Math.abs(anchor.offset - y) < Math.abs(best.offset - y) ? anchor : best,
  );
}

async function settleTo(target: SheetDetent, velocity = 0) {
  const anchor = offsetOf(target, anchors.value);
  if (anchor.detent !== "hidden") settledHidden.value = false;
  animation?.stop();
  if (Number.isNaN(offset)) {
    place(anchor.offset);
    settledHidden.value = anchor.detent === "hidden";
    return;
  }
  animating = true;
  animation = animateSpring({
    from: offset,
    to: anchor.offset,
    spring,
    velocity,
    instant: reduced.value,
    onFrame: place,
  });
  const finished = await animation.finished;
  if (!finished) return;
  animating = false;
  settledHidden.value = offsetOf(detent.value, anchors.value).detent === "hidden";
}

const gesture = useDetentGesture({
  sheet,
  enabled: () => anchors.value.length > 1,
  contentScrolls: () => expanded.value,
  bounds: () => ({ min: 0, max: anchors.value.at(-1)!.offset }),
  onDragStart() {
    animation?.stop();
    animating = false;
    settledHidden.value = false;
    lastAnchor = nearestAnchor(offset);
    return offset;
  },
  onDrag(y) {
    place(y);
    const near = nearestAnchor(y);
    if (Math.abs(near.offset - y) >= 1) return;
    if (near !== lastAnchor) haptics.tick();
    lastAnchor = near;
  },
  onRelease(y, velocity, from) {
    const target = settleDetent(y, velocity, anchors.value, from).detent;
    if (target !== detent.value) detent.value = target;
    void settleTo(target, velocity);
  },
});

watch(detent, (value) => {
  if (!gesture.isDragging()) void settleTo(value);
});

watch(
  anchors,
  (list) => {
    if (!sheet.value || sheetHeight.value === 0 || gesture.isDragging()) return;
    if (animating) void settleTo(detent.value);
    else place(offsetOf(detent.value, list).offset);
  },
  { flush: "sync" },
);

function step() {
  const list = anchors.value;
  const index = indexOfCurrent(list);
  detent.value = index > 0 ? list[index - 1]!.detent : offsetOf("peek", list).detent;
}

function onHandleKeydown(event: KeyboardEvent) {
  const moves: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };
  const move = moves[event.key];
  if (move === undefined) return;
  event.preventDefault();
  const list = anchors.value;
  const anchor = list[indexOfCurrent(list) + move];
  if (anchor) detent.value = anchor.detent;
}

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <div ref="frame" class="m3-standard-sheet-frame">
    <section
      ref="sheet"
      class="m3-standard-sheet"
      :class="{
        'm3-standard-sheet--expanded': expanded,
        'm3-standard-sheet--hidden': settledHidden,
      }"
      :aria-labelledby="props.title ? titleId : undefined"
      :aria-label="props.title ? undefined : props.label"
      :inert="settledHidden"
    >
      <div class="m3-standard-sheet__handle-zone" data-sheet-handle>
        <button
          type="button"
          class="m3-standard-sheet__handle m3-focus-ring"
          :aria-label="expanded ? props.collapseLabel : props.expandLabel"
          @click="step"
          @keydown="onHandleKeydown"
        >
          <span class="m3-standard-sheet__bar" aria-hidden="true" />
        </button>
      </div>
      <header
        v-if="props.title || $slots.header"
        class="m3-standard-sheet__header"
        data-sheet-handle
      >
        <slot name="header">
          <h2 :id="titleId" class="m3-standard-sheet__title">{{ props.title }}</h2>
        </slot>
      </header>
      <div class="m3-standard-sheet__body"><slot :detent="detent" /></div>
    </section>
  </div>
</template>

<style scoped>
.m3-standard-sheet-frame {
  position: fixed;
  inset-inline: 0;
  top: var(--m3-standard-sheet-inset-top, env(safe-area-inset-top));
  bottom: var(--m3-standard-sheet-inset-bottom, 0px);
  z-index: var(--m3-standard-sheet-z, 20);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
}

.m3-standard-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 640px;
  max-height: 100%;
  padding-bottom: max(
    0px,
    calc(env(safe-area-inset-bottom) - var(--m3-standard-sheet-inset-bottom, 0px))
  );
  border-radius: 28px 28px 0 0;
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level1);
  transform: translate3d(0, 100%, 0);
  --m3-segmented-container: var(--md-sys-color-surface-container);
  pointer-events: auto;
  will-change: transform;
}

.m3-standard-sheet::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: calc(100% - 1px);
  height: 100vh;
  background: inherit;
  pointer-events: none;
}

.m3-standard-sheet--hidden {
  visibility: hidden;
}

.m3-standard-sheet__handle-zone {
  display: grid;
  flex: none;
  place-items: center;
  height: 48px;
  touch-action: none;
  cursor: grab;
}

.m3-standard-sheet__handle {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: none;
  cursor: inherit;
  -webkit-tap-highlight-color: transparent;
}

.m3-standard-sheet__bar {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: var(--md-sys-color-on-surface-variant);
  opacity: 0.4;
}

.m3-standard-sheet__header {
  flex: none;
  padding: 0 24px 16px;
  touch-action: none;
}

.m3-standard-sheet__title {
  margin: 0;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
}

.m3-standard-sheet__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  padding-bottom: 16px;
  touch-action: none;
}

.m3-standard-sheet--expanded .m3-standard-sheet__body {
  overflow-y: auto;
  touch-action: pan-y;
}
</style>
