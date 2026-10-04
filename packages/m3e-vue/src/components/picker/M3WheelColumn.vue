<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from "vue";
import { useHaptics } from "../../composables/services.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import type { WheelOption, WheelValue } from "./types.js";

/**
 * One drum of a wheel picker, built the way Framework7 builds its own: a native scroller with snap
 * points and flat rows - no per-row 3D, no mask on the scroller - so a fling stays on the
 * compositor at the phone's frame rate. Each detent ticks (at most every 40ms, so a fling does not
 * flood the native bridge), and the value commits once the scroll rests on an enabled option.
 *
 * `loop` repeats the options in copies and, once a spin settles, jumps without animation to the
 * same option in the middle copy - hours, minutes and months roll over instead of stopping at an
 * end with empty rows above them.
 *
 * The option under the band is marked by touching the two elements that change, not through Vue:
 * a reactive index would re-render every option - 150 of them on a year drum - at every detent.
 * `data-sheet-ignore` keeps a surrounding bottom sheet from reading the spin as a drag.
 */
const props = withDefaults(
  defineProps<{
    options: readonly WheelOption[];
    label: string;
    itemHeight?: number;
    rows?: number;
    align?: "start" | "center" | "end";
    loop?: boolean;
  }>(),
  { itemHeight: 40, rows: 7, align: "center", loop: false },
);

const model = defineModel<WheelValue>();
const scroller = useTemplateRef<HTMLElement>("scroller");
const haptics = useHaptics();
const reduced = useReducedMotion();
const baseId = useId();
const SUPPORTS_SCROLLEND = typeof window !== "undefined" && "onscrollend" in window;
const SETTLE_FALLBACK_MS = 140;
const COPIES = 5;

let active = -1;
let frame = 0;
let settleTimer = 0;
let programmatic = false;
let lastTick = 0;
const TICK_INTERVAL_MS = 40;

const size = computed(() => props.options.length);
const copies = computed(() => (props.loop && size.value > 1 ? COPIES : 1));
const middle = computed(() => Math.floor(copies.value / 2) * size.value);
const rendered = computed(() =>
  Array.from({ length: copies.value }, (_, copy) =>
    props.options.map((option, logical) => ({ option, logical, key: `${copy}:${option.value}` })),
  ).flat(),
);

const logicalOf = (index: number) => (size.value ? index % size.value : 0);
const optionAt = (index: number) => props.options[logicalOf(index)];
const clampIndex = (index: number) => Math.max(0, Math.min(rendered.value.length - 1, index));
const scrolledIndex = () =>
  clampIndex(Math.round((scroller.value?.scrollTop ?? 0) / props.itemHeight));
const logicalIndexOf = (value: WheelValue | undefined) =>
  props.options.findIndex((option) => option.value === value);

/** The rendered row showing `logical` nearest to `from`, so a value change turns the short way. */
function nearestRow(logical: number, from: number): number {
  let best = middle.value + logical;
  for (let copy = 0; copy < copies.value; copy++) {
    const row = copy * size.value + logical;
    if (Math.abs(row - from) < Math.abs(best - from)) best = row;
  }
  return best;
}

function nearestEnabled(index: number): number {
  for (let distance = 0; distance < rendered.value.length; distance++) {
    for (const candidate of [index - distance, index + distance]) {
      if (candidate >= 0 && candidate < rendered.value.length && !optionAt(candidate)?.disabled)
        return candidate;
    }
  }
  return index;
}

function paint(index: number) {
  const element = scroller.value;
  if (!element || index === active) return;
  const previous = element.children[active];
  const next = element.children[index];
  previous?.classList.remove("m3-wheel-column__option--active");
  previous?.setAttribute("aria-selected", "false");
  next?.classList.add("m3-wheel-column__option--active");
  next?.setAttribute("aria-selected", "true");
  element.setAttribute("aria-activedescendant", `${baseId}-${index}`);
  active = index;
}

function scrollToIndex(index: number, smooth: boolean) {
  const element = scroller.value;
  if (!element) return;
  programmatic = true;
  paint(index);
  element.scrollTo({
    top: index * props.itemHeight,
    behavior: smooth && !reduced.value ? "smooth" : "auto",
  });
}

function read() {
  frame = 0;
  const index = scrolledIndex();
  if (index === active) return;
  paint(index);
  if (programmatic) return;
  const now = performance.now();
  if (now - lastTick < TICK_INTERVAL_MS) return;
  lastTick = now;
  haptics.tick();
}

function settle() {
  programmatic = false;
  const index = scrolledIndex();
  const target = nearestEnabled(index);
  if (target !== index) {
    scrollToIndex(target, true);
    return;
  }
  const centred = middle.value + logicalOf(index);
  if (centred !== index) scrollToIndex(centred, false);
  else paint(index);
  const option = optionAt(index);
  if (option && option.value !== model.value) model.value = option.value;
}

function onScroll() {
  if (frame === 0) frame = requestAnimationFrame(read);
  if (!SUPPORTS_SCROLLEND) {
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, SETTLE_FALLBACK_MS);
  }
}

function choose(index: number) {
  if (optionAt(index)?.disabled) return;
  scrollToIndex(index, true);
}

const STEPS: Record<string, (rows: number) => number> = {
  ArrowDown: () => 1,
  ArrowUp: () => -1,
  PageDown: (rows) => rows,
  PageUp: (rows) => -rows,
};

function onKeydown(event: KeyboardEvent) {
  const from = Math.max(0, active);
  const first = from - logicalOf(from);
  let to: number;
  if (event.key === "Home") to = first;
  else if (event.key === "End") to = first + size.value - 1;
  else if (STEPS[event.key]) to = clampIndex(from + STEPS[event.key]!(props.rows));
  else return;
  event.preventDefault();
  scrollToIndex(nearestEnabled(to), true);
}

function place(smooth: boolean) {
  const logical = logicalIndexOf(model.value);
  if (logical < 0) {
    scrollToIndex(nearestEnabled(middle.value), false);
    settle();
    return;
  }
  scrollToIndex(smooth ? nearestRow(logical, scrolledIndex()) : middle.value + logical, smooth);
}

watch(model, (value) => {
  const logical = logicalIndexOf(value);
  if (logical >= 0 && logical !== logicalOf(scrolledIndex())) place(true);
});

watch(
  () => props.options,
  () =>
    void nextTick(() => {
      for (const option of scroller.value?.children ?? []) {
        option.classList.remove("m3-wheel-column__option--active");
        option.setAttribute("aria-selected", "false");
      }
      active = -1;
      place(false);
    }),
);

onMounted(() => place(false));

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  clearTimeout(settleTimer);
});
</script>

<template>
  <div
    ref="scroller"
    class="m3-wheel-column"
    :class="`m3-wheel-column--${props.align}`"
    :style="{ '--m3-wheel-item': `${props.itemHeight}px`, '--m3-wheel-rows': props.rows }"
    role="listbox"
    tabindex="0"
    :aria-label="props.label"
    data-sheet-ignore
    @scroll.passive="onScroll"
    @scrollend="settle"
    @pointerdown="programmatic = false"
    @keydown="onKeydown"
  >
    <div
      v-for="(row, index) in rendered"
      :id="`${baseId}-${index}`"
      :key="row.key"
      class="m3-wheel-column__option"
      :class="{ 'm3-wheel-column__option--disabled': row.option.disabled }"
      role="option"
      aria-selected="false"
      :aria-disabled="row.option.disabled || undefined"
      @click="choose(index)"
    >
      {{ row.option.label }}
    </div>
  </div>
</template>

<style scoped>
.m3-wheel-column {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  height: calc(var(--m3-wheel-item) * var(--m3-wheel-rows));
  padding-block: calc(var(--m3-wheel-item) * (var(--m3-wheel-rows) - 1) / 2);
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  contain: layout paint style;
  outline: none;
  touch-action: pan-y;
}

.m3-wheel-column::-webkit-scrollbar {
  display: none;
}

.m3-wheel-column:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
  border-radius: var(--md-sys-shape-corner-medium);
}

.m3-wheel-column__option {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--m3-wheel-item);
  padding-inline: 12px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  scroll-snap-align: center;
  contain: layout style;
  cursor: pointer;
  transition: color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-wheel-column--start .m3-wheel-column__option {
  justify-content: flex-start;
}

.m3-wheel-column--end .m3-wheel-column__option {
  justify-content: flex-end;
}

.m3-wheel-column__option--active {
  color: var(--md-sys-color-on-surface);
  font-weight: 500;
}

.m3-wheel-column__option--disabled {
  opacity: 0.38;
  cursor: default;
}
</style>
