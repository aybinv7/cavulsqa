<script setup lang="ts" generic="T">
import { animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { useSwipeReveal } from "../../composables/useSwipeReveal.js";
import { useWheelScroll } from "../../composables/useWheelScroll.js";
import {
  MAX_SMALL_ITEM_SIZE,
  MIN_SMALL_ITEM_SIZE,
  heroKeylines,
  multiBrowseKeylines,
  uncontainedKeylines,
} from "../../utils/carousel/arrangement.js";
import { settleCarousel, type CarouselFling } from "../../utils/carousel/settle.js";
import {
  createStrategy,
  keylinesForScrollOffset,
  maxScrollOffset,
  placeItem,
  snapScrollOffset,
} from "../../utils/carousel/strategy.js";

/**
 * Compose's carousel, keyline for keyline: every item is laid out at the large size and masked
 * down to the keyline it sits between, so it compresses as it moves toward the edge and its
 * content parallaxes under the mask instead of squashing.
 *
 * - `multi-browse` (default): large items with a medium and a small one peeking - browsing many
 *   items, like photos. Flings travel as far as they carry and snap to an item.
 * - `hero`: one large item, centred between two small ones in the middle of the list - a featured
 *   item at a time. A fling moves one item.
 * - `uncontained`: full-size items of `item-width`, the one at the edge compressing as it leaves;
 *   it coasts without snapping.
 *
 * It scrolls itself - one drag, one spring, one frame writing transforms and masks - so the masks
 * never trail the scroll. Each item gets `--m3-carousel-item-size` and `--m3-carousel-mask-start`
 * (px) and `--m3-carousel-item-progress` (0 at the smallest keyline, 1 at full size) to fade or
 * slide labels with its mask; the slot receives `{ item, index, scrollTo }`.
 *
 * @see https://m3.material.io/components/carousel/specs
 */
const props = withDefaults(
  defineProps<{
    items: readonly T[];
    label: string;
    variant?: "multi-browse" | "hero" | "uncontained";
    itemWidth?: number;
    itemSpacing?: number;
    contentPadding?: number;
    height?: number;
    minSmallItemWidth?: number;
    maxSmallItemWidth?: number;
    itemKey?: (item: T, index: number) => string | number;
    slideLabel?: (index: number, count: number) => string;
  }>(),
  {
    variant: "multi-browse",
    itemSpacing: 8,
    contentPadding: 16,
    height: 205,
    minSmallItemWidth: MIN_SMALL_ITEM_SIZE,
    maxSmallItemWidth: MAX_SMALL_ITEM_SIZE,
    slideLabel: (index: number, count: number) => `${index + 1} / ${count}`,
  },
);

const current = defineModel<number>("item", { default: 0 });

defineSlots<{
  default: (scope: { item: T; index: number; scrollTo: () => void }) => unknown;
}>();

const root = useTemplateRef<HTMLElement>("root");
const { width } = useElementSize(root);
const reduced = useReducedMotion();
const SNAP_SPRING = { dampingRatio: 1, stiffness: 400 };
const RADIUS = 28;
const RESISTANCE = 0.35;

const elements: (HTMLElement | null)[] = [];
const hidden: boolean[] = [];
let scroll = 0;
let startScroll = 0;
let startIndex = 0;
let animation: SpringAnimation | null = null;
let animatingTo: number | null = null;
const dragging = shallowRef(false);

const count = computed(() => props.items.length);

const strategy = computed(() => {
  const space = width.value;
  const small = { min: props.minSmallItemWidth, max: props.maxSmallItemWidth };
  const spacing = props.itemSpacing;
  const keylines =
    props.variant === "uncontained"
      ? uncontainedKeylines(space, props.itemWidth ?? 186, spacing)
      : props.variant === "hero"
        ? heroKeylines(space, props.itemWidth, spacing, count.value, true, small)
        : multiBrowseKeylines(space, props.itemWidth ?? 186, spacing, count.value, small);
  return createStrategy(keylines, space, spacing, props.contentPadding, props.contentPadding);
});

const maxScroll = computed(() => maxScrollOffset(strategy.value, count.value));
const snaps = computed(() =>
  Array.from({ length: count.value }, (_, index) =>
    snapScrollOffset(strategy.value, index, count.value),
  ),
);
const fling = computed<CarouselFling>(() =>
  props.variant === "uncontained" ? "none" : props.variant === "hero" ? "single" : "multi",
);
const itemSize = computed(() => Math.round(strategy.value.itemSize));

let rtl = false;
const readDirection = () => {
  rtl = root.value ? getComputedStyle(root.value).direction === "rtl" : false;
};

function setElement(index: number, element: unknown) {
  elements[index] = element instanceof HTMLElement ? element : null;
}

function render() {
  const plan = strategy.value;
  if (!plan.isValid) return;
  const keylines = keylinesForScrollOffset(plan, scroll, maxScroll.value);
  const space = plan.space;
  const size = plan.itemSize;
  const focus = nearest(scroll);
  for (let index = 0; index < count.value; index++) {
    const element = elements[index];
    if (!element) continue;
    const placement = placeItem(plan, keylines, index, scroll);
    const start = placement.center - size / 2;
    const off =
      placement.center + placement.size / 2 < 0 || placement.center - placement.size / 2 > space;
    if (off !== hidden[index]) {
      hidden[index] = off;
      element.style.visibility = off ? "hidden" : "";
      element.inert = off;
    }
    if (off) continue;
    const inset = Math.max(0, (size - placement.size) / 2);
    const x = rtl ? space - start - size : start;
    element.style.transform = `translate3d(${x}px, 0, 0)`;
    element.style.clipPath = `inset(0 ${inset}px 0 ${inset}px round ${RADIUS}px)`;
    element.style.zIndex = String(Math.round(100 / (1 + Math.abs(index - focus))));
    element.style.setProperty("--m3-carousel-item-size", `${placement.size}px`);
    element.style.setProperty("--m3-carousel-mask-start", `${inset}px`);
    element.style.setProperty("--m3-carousel-item-progress", progressOf(placement.size).toFixed(3));
  }
}

function progressOf(size: number): number {
  const { minItemSize, maxItemSize } = strategy.value;
  if (maxItemSize <= minItemSize) return 1;
  return Math.min(1, Math.max(0, (size - minItemSize) / (maxItemSize - minItemSize)));
}

function nearest(offset: number): number {
  let best = 0;
  snaps.value.forEach((snap, index) => {
    if (Math.abs(snap - offset) < Math.abs(snaps.value[best]! - offset)) best = index;
  });
  return best;
}

function setScroll(offset: number) {
  scroll = offset;
  render();
}

function stop() {
  animation?.stop();
  animatingTo = null;
}

async function animateTo(offset: number, velocity = 0) {
  animation?.stop();
  animatingTo = offset;
  const run = animateSpring({
    from: scroll,
    to: offset,
    spring: SNAP_SPRING,
    velocity,
    instant: reduced.value,
    onFrame: setScroll,
  });
  animation = run;
  if ((await run.finished) && animation === run) animatingTo = null;
}

function scrollTo(index: number) {
  const target = Math.min(count.value - 1, Math.max(0, index));
  current.value = target;
  void animateTo(snaps.value[target] ?? 0);
}

function settle(velocity: number) {
  const target = settleCarousel({
    snaps: snaps.value,
    scroll,
    velocity,
    startIndex,
    fling: fling.value,
    itemSize: strategy.value.itemSize,
    maxScroll: maxScroll.value,
  });
  if (target.index !== null) current.value = target.index;
  void animateTo(target.offset, velocity);
}

function resist(offset: number): number {
  const max = maxScroll.value;
  if (offset < 0) return offset * RESISTANCE;
  if (offset > max) return max + (offset - max) * RESISTANCE;
  return offset;
}

useSwipeReveal({
  row: root,
  enabled: () => strategy.value.isValid && maxScroll.value > 0,
  onStart() {
    stop();
    readDirection();
    dragging.value = true;
    startScroll = scroll;
    startIndex = nearest(scroll);
    return 0;
  },
  onMove(moved) {
    setScroll(resist(startScroll - moved));
  },
  onEnd(_, velocity) {
    dragging.value = false;
    settle(-velocity);
  },
});

useWheelScroll({
  target: root,
  enabled: () => strategy.value.isValid && maxScroll.value > 0,
  onDelta(delta) {
    stop();
    if (!dragging.value) startIndex = nearest(scroll);
    dragging.value = true;
    setScroll(Math.min(maxScroll.value, Math.max(0, scroll + delta)));
  },
  onIdle() {
    dragging.value = false;
    settle(0);
  },
});

function onKeydown(event: KeyboardEvent) {
  readDirection();
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const backward = rtl ? "ArrowRight" : "ArrowLeft";
  const moves: Record<string, number> = {
    [forward]: current.value + 1,
    [backward]: current.value - 1,
    Home: 0,
    End: count.value - 1,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  scrollTo(next);
}

function onFocusIn(event: FocusEvent) {
  const index = elements.findIndex((element) => element?.contains(event.target as Node));
  if (index >= 0 && index !== current.value) scrollTo(index);
}

watch(
  [strategy, count],
  () => {
    stop();
    const index = Math.min(current.value, Math.max(0, count.value - 1));
    hidden.length = 0;
    readDirection();
    scroll = snaps.value[index] ?? 0;
    render();
  },
  { flush: "post" },
);

watch(current, (index) => {
  if (dragging.value) return;
  const target = snaps.value[index];
  if (target === undefined || target === animatingTo || Math.abs(target - scroll) < 0.5) return;
  void animateTo(target);
});

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <div
    ref="root"
    class="m3-carousel"
    role="region"
    aria-roledescription="carousel"
    :aria-label="props.label"
    tabindex="0"
    :style="{ height: `${props.height}px` }"
    @keydown="onKeydown"
    @focusin="onFocusIn"
  >
    <div
      v-for="(item, index) in props.items"
      :key="props.itemKey ? props.itemKey(item, index) : index"
      :ref="(element) => setElement(index, element)"
      class="m3-carousel__item"
      role="group"
      aria-roledescription="slide"
      :aria-label="props.slideLabel(index, count)"
      :style="{ width: `${itemSize}px` }"
    >
      <slot v-bind="{ item, index, scrollTo: () => scrollTo(index) }" />
    </div>
  </div>
</template>

<style scoped>
.m3-carousel {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-carousel:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: 2px;
  border-radius: 28px;
}

.m3-carousel__item {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--md-sys-color-surface-container-highest);
  transform: translate3d(-200vw, 0, 0);
  will-change: transform, clip-path;
}

.m3-carousel__item :deep(img) {
  -webkit-user-drag: none;
  pointer-events: none;
}
</style>
