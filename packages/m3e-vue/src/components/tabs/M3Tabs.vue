<script setup lang="ts">
import { computed, nextTick, onMounted, provide, shallowRef, useTemplateRef, watch } from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import { useHaptics } from "../../composables/services.js";
import { TABS } from "./context.js";

/**
 * Primary or secondary tabs with one indicator that springs to the selected tab. Fixed tabs share
 * the row equally; primary tabs get a 3dp rounded indicator as wide as the tab's content, secondary
 * tabs a 2dp one across the whole tab. Arrow keys move between tabs. `scrollable` keeps every tab at its natural width and
 * brings the selected one into view.
 *
 * @see https://m3.material.io/components/tabs/specs
 */
const props = withDefaults(
  defineProps<{ variant?: "primary" | "secondary"; scrollable?: boolean; label?: string }>(),
  { variant: "primary", scrollable: false },
);

const selected = defineModel<string>();
const root = useTemplateRef<HTMLElement>("root");
const { width } = useElementSize(root);
const haptics = useHaptics();
const indicator = shallowRef({ left: 0, width: 0, ready: false });

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

function measure() {
  const list = root.value;
  const tab = tabElements().find((element) => element.dataset.value === selected.value);
  if (!list || !tab) {
    indicator.value = { ...indicator.value, width: 0 };
    return;
  }
  const target =
    props.variant === "primary"
      ? (tab.querySelector<HTMLElement>("[data-tab-content]") ?? tab)
      : tab;
  const listRect = list.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const contentWidth = Math.max(24, rect.width);
  const left = rect.left - listRect.left + list.scrollLeft + (rect.width - contentWidth) / 2;
  const first = !indicator.value.ready;
  indicator.value = { left, width: contentWidth, ready: indicator.value.ready };
  if (first) requestAnimationFrame(() => (indicator.value = { ...indicator.value, ready: true }));
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
      class="m3-tabs__indicator"
      :class="{ 'm3-tabs__indicator--ready': indicator.ready }"
      aria-hidden="true"
      :style="{ width: `${indicator.width}px`, transform: `translateX(${indicator.left}px)` }"
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
