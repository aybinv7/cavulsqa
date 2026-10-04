<script setup lang="ts">
import { animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { onBeforeUnmount, provide, shallowRef, useTemplateRef, watch } from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { useSwipeReveal } from "../../composables/useSwipeReveal.js";
import { pageTarget } from "../../utils/photoZoom.js";
import type { TabPager } from "./pager.js";
import { TAB_PANELS } from "./panelsContext.js";

/**
 * Framework7's swipeable tabs: the pages behind `M3Tabs`, side by side, swiped between with the
 * finger - Compose's `HorizontalPager` under a `TabRow`. Bind the same `v-model` as the tabs and
 * pass both one `createTabPager()` so the indicator follows the swipe. Each `M3TabPanel` scrolls on
 * its own, so switching tabs keeps every tab's place; give the panels a height (a flex column that
 * fills the screen, or a fixed one). A panel renders once it is next to the one showing and stays
 * rendered after. A carousel or swipeable row inside a panel keeps its own sideways drag.
 */
const props = defineProps<{ pager?: TabPager }>();

const selected = defineModel<string>();
const root = useTemplateRef<HTMLElement>("root");
const track = useTemplateRef<HTMLElement>("track");
const { width } = useElementSize(root);
const reduced = useReducedMotion();
const SPRING = { dampingRatio: 1, stiffness: 400 };

const values = shallowRef<string[]>([]);
const visited = shallowRef(new Set<string>(selected.value === undefined ? [] : [selected.value]));
let offset = 0;
let animation: SpringAnimation | null = null;
let rtl = false;
let swiped = false;

const readDirection = () => {
  rtl = root.value ? getComputedStyle(root.value).direction === "rtl" : false;
};

const indexOf = (value: string | undefined) =>
  value === undefined ? -1 : values.value.indexOf(value);

function order() {
  const elements = [...(track.value?.children ?? [])] as HTMLElement[];
  const ranked = elements.map((element) => element.dataset.value ?? "");
  values.value = [...values.value].sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b));
}

provide(TAB_PANELS, {
  selected,
  rendered(value) {
    if (visited.value.has(value)) return true;
    return Math.abs(indexOf(value) - indexOf(selected.value)) <= 1;
  },
  register(value) {
    values.value = [...values.value, value];
    queueMicrotask(order);
    return () => {
      values.value = values.value.filter((entry) => entry !== value);
    };
  },
});

function render(report: boolean) {
  const index = Math.max(0, indexOf(selected.value));
  const size = width.value || 1;
  if (track.value) {
    const x = (-index * size + offset) * (rtl ? -1 : 1);
    track.value.style.transform = `translate3d(${x}px, 0, 0)`;
  }
  if (report) props.pager?.update(index - offset / size);
}

function animateOffset(to: number, velocity: number, report: boolean) {
  animation?.stop();
  const from = offset;
  animation = animateSpring({
    from,
    to,
    spring: SPRING,
    velocity,
    instant: reduced.value,
    onFrame(value) {
      offset = value;
      render(report);
    },
  });
  return animation.finished;
}

useSwipeReveal({
  row: root,
  enabled: () => values.value.length > 1,
  onStart() {
    animation?.stop();
    readDirection();
    return offset;
  },
  onMove(moved) {
    const index = indexOf(selected.value);
    const atEdge = (moved > 0 && index === 0) || (moved < 0 && index === values.value.length - 1);
    offset = atEdge ? moved / 3 : moved;
    render(true);
  },
  async onEnd(moved, velocity) {
    const index = indexOf(selected.value);
    const size = width.value || 1;
    const target = pageTarget(index, values.value.length, moved, velocity, size);
    const destination = (index - target) * size;
    if (await animateOffset(destination, velocity, true)) {
      offset = 0;
      if (target !== index) {
        swiped = true;
        selected.value = values.value[target];
      }
      render(true);
    }
  },
});

watch(selected, (value, previous) => {
  if (value !== undefined) {
    const next = new Set(visited.value);
    next.add(value);
    visited.value = next;
  }
  const from = indexOf(previous);
  const to = indexOf(value);
  if (swiped || from < 0 || to < 0 || offset !== 0) {
    swiped = false;
    render(false);
    return;
  }
  offset = (to - from) * (width.value || 1);
  render(false);
  void animateOffset(0, 0, false);
});

watch(
  [width, values],
  () => {
    readDirection();
    render(false);
  },
  { flush: "post" },
);

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <div ref="root" class="m3-tab-panels">
    <div ref="track" class="m3-tab-panels__track"><slot /></div>
  </div>
</template>

<style scoped>
.m3-tab-panels {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
}

.m3-tab-panels__track {
  display: flex;
  height: 100%;
  will-change: transform;
}
</style>
