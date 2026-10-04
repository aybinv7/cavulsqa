<script setup lang="ts">
import M3PageIndicator from "./M3PageIndicator.vue";
import {
  computed,
  onMounted,
  onScopeDispose,
  provide,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { PAGER, type PagerContext } from "./context.js";

/**
 * Framework7's swiper as a pager: full-width `M3PagerPage`s swiped one at a time - onboarding,
 * a product's photos, a tour of a feature. It is the browser's own snap scrolling, so a fling keeps
 * the platform's feel and moves on the compositor, and `v-model:page` follows where it settles.
 * The page dots underneath track the finger; replace them through `#footer`, which receives
 * `{ page, count, progress, go, next, previous }` - for Skip and Next buttons beside the dots.
 * The arrow keys, Home and End turn pages with focus on it.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    indicator?: boolean;
    indicatorLabel?: string;
    pageLabel?: (page: number) => string;
  }>(),
  { indicator: true },
);

const page = defineModel<number>("page", { default: 0 });

defineSlots<{
  default?: () => unknown;
  footer?: (scope: {
    page: number;
    count: number;
    progress: number;
    go: (index: number) => void;
    next: () => void;
    previous: () => void;
  }) => unknown;
}>();

const track = useTemplateRef<HTMLElement>("track");
const { width } = useElementSize(track);
const reduced = useReducedMotion();
const pages = shallowRef<HTMLElement[]>([]);
const progress = shallowRef(page.value);
const settled = shallowRef(page.value);
const count = computed(() => pages.value.length);
let frame = 0;

const direction = () => (track.value && getComputedStyle(track.value).direction === "rtl" ? -1 : 1);
const pageWidth = (element: HTMLElement) => width.value || element.clientWidth;
const clamp = (index: number) => Math.max(0, Math.min(count.value - 1, index));

function read(): number {
  const element = track.value;
  const size = element ? pageWidth(element) : 0;
  if (!element || size === 0) return settled.value;
  return Math.abs(element.scrollLeft) / size;
}

function settle(index: number) {
  settled.value = index;
  progress.value = index;
  if (page.value !== index) page.value = index;
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    progress.value = read();
    const nearest = Math.round(progress.value);
    if (Math.abs(progress.value - nearest) < 0.01) settle(clamp(nearest));
  });
}

function scrollTo(index: number, smooth: boolean) {
  const element = track.value;
  if (!element) return;
  element.scrollTo({
    left: index * pageWidth(element) * direction(),
    behavior: smooth && !reduced.value ? "smooth" : "instant",
  });
}

function go(index: number) {
  if (count.value === 0) return;
  const target = clamp(index);
  if (target === settled.value && Math.abs(progress.value - target) < 0.01) return;
  scrollTo(target, true);
}

function onKeydown(event: KeyboardEvent) {
  const forward = direction() === 1 ? "ArrowRight" : "ArrowLeft";
  const back = direction() === 1 ? "ArrowLeft" : "ArrowRight";
  const moves: Record<string, number> = {
    [forward]: settled.value + 1,
    [back]: settled.value - 1,
    Home: 0,
    End: count.value - 1,
  };
  const target = moves[event.key];
  if (target === undefined) return;
  event.preventDefault();
  go(target);
}

watch(page, (index) => {
  if (index !== settled.value) go(index);
});

watch(width, () => {
  if (count.value > 0) scrollTo(settled.value, false);
});

onMounted(() => {
  settled.value = clamp(page.value);
  scrollTo(settled.value, false);
});

onScopeDispose(() => {
  if (frame) cancelAnimationFrame(frame);
});

const context: PagerContext = {
  current: settled,
  count,
  register(element) {
    pages.value = [...pages.value, element].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    return () => {
      pages.value = pages.value.filter((entry) => entry !== element);
    };
  },
  indexOf: (element) => (element ? pages.value.indexOf(element) : -1),
};

provide(PAGER, context);

const scope = computed(() => ({
  page: settled.value,
  count: count.value,
  progress: progress.value,
  go,
  next: () => go(settled.value + 1),
  previous: () => go(settled.value - 1),
}));
</script>

<template>
  <section class="m3-pager" aria-roledescription="carousel" :aria-label="props.label">
    <div
      ref="track"
      class="m3-pager__track"
      tabindex="0"
      @scroll.passive="onScroll"
      @scrollend="settle(clamp(Math.round(read())))"
      @keydown="onKeydown"
    >
      <slot />
    </div>
    <slot name="footer" v-bind="scope">
      <M3PageIndicator
        v-if="props.indicator && count > 1"
        class="m3-pager__dots"
        :count="count"
        :progress="progress"
        :label="props.indicatorLabel"
        :page-label="props.pageLabel"
        @select="go"
      />
    </slot>
  </section>
</template>

<style scoped>
.m3-pager {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.m3-pager__track {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  outline: none;
}

.m3-pager__track::-webkit-scrollbar {
  display: none;
}

.m3-pager__track:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
}

.m3-pager__dots {
  align-self: center;
  margin-top: 12px;
}
</style>
