<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import { useHaptics } from "../../composables/services.js";
import { TABS } from "./context.js";
import type { TabPager } from "./pager.js";

/**
 * Primary or secondary tabs with one indicator that springs to the selected tab. Fixed tabs share
 * the row equally; primary tabs get a 3dp rounded indicator as wide as the tab's content, secondary
 * tabs a 2dp one across the whole tab. Arrow keys move between tabs. `scrollable` keeps every tab
 * at its natural width and brings the selected one into view. With `M3TabPanels`, pass both the
 * same `pager` and the indicator follows the pages while they are swiped.
 *
 * @see https://m3.material.io/components/tabs/specs
 */
const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary";
    scrollable?: boolean;
    label?: string;
    pager?: TabPager;
  }>(),
  { variant: "primary", scrollable: false },
);

const selected = defineModel<string>();
const root = useTemplateRef<HTMLElement>("root");
const bar = useTemplateRef<HTMLElement>("bar");
const { width } = useElementSize(root);
const haptics = useHaptics();
const ready = shallowRef(false);
let placed = { left: 0, width: 0 };

/**
 * The indicator's one writer. A swipe and a tap both move it here, so nothing else - a template
 * style binding re-applied on the next render - can put it back where it was and make it run the
 * same move twice.
 */
function place(left: number, width: number, animate: boolean) {
  const element = bar.value;
  if (!element) return;
  if (Math.abs(left - placed.left) < 0.5 && Math.abs(width - placed.width) < 0.5) {
    element.style.transition = "";
    return;
  }
  element.style.transition = animate ? "" : "none";
  element.style.width = `${width}px`;
  element.style.transform = `translateX(${left}px)`;
  placed = { left, width };
}

provide(TABS, {
  selected,
  variant: computed(() => props.variant),
  select(value) {
    if (selected.value !== value) haptics.tick();
    selected.value = value;
  },
});

const tabElements = () => [
  ...(root.value?.querySelectorAll<HTMLElement>(":scope > [role=tab]") ?? []),
];

function spanOf(list: HTMLElement, tab: HTMLElement): { left: number; width: number } {
  const target =
    props.variant === "primary"
      ? (tab.querySelector<HTMLElement>("[data-tab-content]") ?? tab)
      : tab;
  const listRect = list.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const width = Math.max(24, rect.width);
  return { left: rect.left - listRect.left + list.scrollLeft + (rect.width - width) / 2, width };
}

function measure() {
  const list = root.value;
  const tab = tabElements().find((element) => element.dataset.value === selected.value);
  if (!list || !tab) {
    place(placed.left, 0, false);
    return;
  }
  const { left, width: contentWidth } = spanOf(list, tab);
  place(left, contentWidth, ready.value);
  if (!ready.value) requestAnimationFrame(() => (ready.value = true));
  if (props.scrollable)
    tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function onKeydown(event: KeyboardEvent) {
  const keys: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    Home: -Infinity,
    End: Infinity,
  };
  if (!(event.key in keys)) return;
  const tabs = tabElements().filter((tab) => !tab.hasAttribute("disabled"));
  if (tabs.length === 0) return;
  event.preventDefault();
  const rtl = getComputedStyle(root.value!).direction === "rtl";
  const step = keys[event.key]! * (rtl && Number.isFinite(keys[event.key]) ? -1 : 1);
  const index = tabs.findIndex((tab) => tab === document.activeElement);
  const next =
    step === -Infinity
      ? 0
      : step === Infinity
        ? tabs.length - 1
        : (index + step + tabs.length) % tabs.length;
  tabs[next]!.focus();
  tabs[next]!.click();
}

function follow(position: number) {
  const list = root.value;
  const tabs = tabElements();
  const element = bar.value;
  if (!list || !element || tabs.length === 0) return;
  const clamped = Math.min(tabs.length - 1, Math.max(0, position));
  const lower = Math.floor(clamped);
  const upper = Math.min(tabs.length - 1, lower + 1);
  const fraction = clamped - lower;
  const a = spanOf(list, tabs[lower]!);
  const b = spanOf(list, tabs[upper]!);
  place(a.left + (b.left - a.left) * fraction, a.width + (b.width - a.width) * fraction, false);
}

let unfollow: (() => void) | undefined;
watch(
  () => props.pager,
  (pager) => {
    unfollow?.();
    unfollow = pager?.follow(follow);
  },
  { immediate: true },
);
onBeforeUnmount(() => unfollow?.());

watch([selected, width, () => props.variant], () => void nextTick(measure));
onMounted(() => void nextTick(measure));
</script>

<template>
  <div
    ref="root"
    class="m3-tabs"
    :class="[`m3-tabs--${props.variant}`, { 'm3-tabs--scrollable': props.scrollable }]"
    role="tablist"
    :aria-label="props.label"
    @keydown="onKeydown"
  >
    <slot />
    <span
      ref="bar"
      class="m3-tabs__indicator"
      :class="{ 'm3-tabs__indicator--ready': ready }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.m3-tabs {
  position: relative;
  display: flex;
  background: var(--m3-tabs-container, var(--md-sys-color-surface));
  transition: background-color var(--md-sys-motion-spring-default-effects-duration)
    var(--md-sys-motion-spring-default-effects);
  box-shadow: inset 0 -1px 0 var(--md-sys-color-outline-variant);
}

.m3-tabs--scrollable {
  overflow-x: auto;
  scrollbar-width: none;
  padding-inline: 52px 0;
}

.m3-tabs--scrollable::-webkit-scrollbar {
  display: none;
}

.m3-tabs--scrollable > :deep(.m3-tab) {
  flex: 0 0 auto;
  min-width: 90px;
}

.m3-tabs__indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 3px;
  border-radius: 3px;
  background: var(--md-sys-color-primary);
  pointer-events: none;
}

.m3-tabs__indicator--ready {
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    width var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}

.m3-tabs--secondary .m3-tabs__indicator {
  height: 2px;
  border-radius: 0;
}
</style>
