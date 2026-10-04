<script setup lang="ts" generic="T extends TimelineEvent">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { vRipple } from "../../directives/ripple.js";
import {
  formatHour,
  formatMinutes,
  layoutEvents,
  minutesOfDay,
  type PlacedEvent,
  type TimelineEvent,
} from "../../utils/dayTimeline.js";

/**
 * A day as an hour grid, the way a calendar's day view reads: each event sits at its start time,
 * as tall as it lasts, and events that overlap share the width in lanes. `current` marks the day
 * as today and draws the line at the current minute, kept in step with the clock.
 *
 * Events are minutes since midnight; the grid shows `startHour` to `endHour`, and an event outside
 * that window is left out. `scrollToMinute` brings a time into view inside whatever scrolls the
 * timeline, so a screen can open on the next visit or on now.
 */
const props = withDefaults(
  defineProps<{
    events: readonly T[];
    startHour?: number;
    endHour?: number;
    /** Pixels per hour. */
    hourHeight?: number;
    locale?: string;
    current?: boolean;
    label?: string;
    eventLabel?: (event: T) => string;
  }>(),
  { startHour: 0, endHour: 24, hourHeight: 64, current: false },
);

const emit = defineEmits<{ select: [event: T] }>();

defineSlots<{
  event?: (scope: { event: T; start: string; end: string; compact: boolean }) => unknown;
}>();

const MIN_HEIGHT = 28;
const COMPACT_HEIGHT = 44;

const root = useTemplateRef<HTMLElement>("root");
const locale = computed(
  () =>
    props.locale ?? (typeof document !== "undefined" ? document.documentElement.lang : "") ?? "en",
);
const first = computed(() => Math.max(0, Math.min(23, Math.floor(props.startHour))));
const last = computed(() => Math.max(first.value + 1, Math.min(24, Math.ceil(props.endHour))));
const from = computed(() => first.value * 60);
const to = computed(() => last.value * 60);
const hours = computed(() =>
  Array.from({ length: last.value - first.value + 1 }, (_, index) => first.value + index),
);
const perMinute = computed(() => props.hourHeight / 60);

const placed = computed(() =>
  layoutEvents(
    props.events.filter((event) => event.end > from.value && event.start < to.value),
    MIN_HEIGHT / perMinute.value,
  ),
);

const now = shallowRef(minutesOfDay());
const nowVisible = computed(
  () => props.current && now.value >= from.value && now.value <= to.value,
);
let timer: ReturnType<typeof setTimeout> | undefined;

function tick() {
  now.value = minutesOfDay();
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
}

function onVisibility() {
  if (document.visibilityState === "visible") now.value = minutesOfDay();
}

function stopClock() {
  clearTimeout(timer);
  timer = undefined;
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
  }
}

watch(
  () => props.current,
  (current) => {
    stopClock();
    if (!current || typeof document === "undefined") return;
    tick();
    document.addEventListener("visibilitychange", onVisibility);
  },
  { immediate: true },
);

onBeforeUnmount(stopClock);

function offset(minute: number): number {
  return (Math.min(to.value, Math.max(from.value, minute)) - from.value) * perMinute.value;
}

function height(entry: PlacedEvent<T>): number {
  return Math.max(MIN_HEIGHT, offset(entry.event.end) - offset(entry.event.start));
}

function slotStyle(entry: PlacedEvent<T>, index: number) {
  return {
    "--m3-day-timeline-top": `${offset(entry.event.start)}px`,
    "--m3-day-timeline-height": `${height(entry)}px`,
    "--m3-day-timeline-column": entry.column,
    "--m3-day-timeline-columns": entry.columns,
    "--m3-day-timeline-index": index,
  };
}

function clock(minute: number): string {
  return formatMinutes(minute, locale.value || "en");
}

function ariaLabel(event: T): string {
  return props.eventLabel?.(event) ?? `${clock(event.start)} – ${clock(event.end)}`;
}

function scroller(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Scrolls the nearest scrolling ancestor so `minute` sits a quarter of the way down it - the hour
 * before stays in sight, which is what tells the reader where they are in the day.
 */
function scrollToMinute(minute: number, behavior: ScrollBehavior = "smooth") {
  const element = root.value;
  if (!element) return;
  const target = scroller(element);
  if (!target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top =
    element.getBoundingClientRect().top -
    target.getBoundingClientRect().top +
    target.scrollTop +
    offset(minute) -
    target.clientHeight / 4;
  target.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : behavior });
}

defineExpose({ scrollToMinute });
</script>

<template>
  <div
    ref="root"
    class="m3-day-timeline"
    role="group"
    :aria-label="props.label"
    :style="{
      '--m3-day-timeline-hour': `${props.hourHeight}px`,
      '--m3-day-timeline-span': `${(last - first) * props.hourHeight}px`,
    }"
  >
    <div class="m3-day-timeline__hours" aria-hidden="true">
      <span
        v-for="hour in hours"
        :key="hour"
        class="m3-day-timeline__hour"
        :style="{ '--m3-day-timeline-at': hour - first }"
        >{{ formatHour(hour, locale || "en") }}</span
      >
    </div>
    <div class="m3-day-timeline__track">
      <ul class="m3-day-timeline__events">
        <li
          v-for="(entry, index) in placed"
          :key="entry.event.id"
          class="m3-day-timeline__slot"
          :style="slotStyle(entry, index)"
        >
          <button
            v-ripple
            type="button"
            class="m3-day-timeline__event m3-state m3-focus-ring"
            :class="[
              `m3-day-timeline__event--${entry.event.tone ?? 'secondary'}`,
              { 'm3-day-timeline__event--compact': height(entry) < COMPACT_HEIGHT },
            ]"
            :aria-label="ariaLabel(entry.event)"
            @click="emit('select', entry.event)"
          >
            <slot
              name="event"
              :event="entry.event"
              :start="clock(entry.event.start)"
              :end="clock(entry.event.end)"
              :compact="height(entry) < COMPACT_HEIGHT"
            >
              <span class="m3-day-timeline__time"
                >{{ clock(entry.event.start) }} – {{ clock(entry.event.end) }}</span
              >
            </slot>
          </button>
        </li>
      </ul>
      <div
        v-if="nowVisible"
        class="m3-day-timeline__now"
        :style="{ '--m3-day-timeline-top': `${offset(now)}px` }"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.m3-day-timeline {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  padding-block: 12px;
  padding-inline-end: 12px;
  color: var(--md-sys-color-on-surface);
}

.m3-day-timeline__hours {
  position: relative;
  height: var(--m3-day-timeline-span);
}

.m3-day-timeline__hour {
  position: absolute;
  inset-inline: 0 8px;
  top: calc(var(--m3-day-timeline-at) * var(--m3-day-timeline-hour));
  transform: translateY(-50%);
  text-align: end;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) /
    var(--md-sys-typescale-label-small-line-height) var(--md-sys-typescale-label-small-font);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.m3-day-timeline__track {
  position: relative;
  height: var(--m3-day-timeline-span);
  border-block-end: 1px solid var(--md-sys-color-outline-variant);
  background: repeating-linear-gradient(
    to bottom,
    var(--md-sys-color-outline-variant) 0 1px,
    transparent 1px var(--m3-day-timeline-hour)
  );
}

.m3-day-timeline__events {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.m3-day-timeline__slot {
  position: absolute;
  top: var(--m3-day-timeline-top);
  height: var(--m3-day-timeline-height);
  inset-inline-start: calc(100% * var(--m3-day-timeline-column) / var(--m3-day-timeline-columns));
  width: calc(100% / var(--m3-day-timeline-columns));
  padding: 1px 2px;
  box-sizing: border-box;
}

.m3-day-timeline__event {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 6px 10px;
  overflow: hidden;
  border: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  text-align: start;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  cursor: pointer;
}

.m3-day-timeline__event > :slotted(*),
.m3-day-timeline__time {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-day-timeline__event--compact {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-block: 0;
  border-radius: var(--md-sys-shape-corner-small);
}

.m3-day-timeline__event--primary {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-day-timeline__event--secondary {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-day-timeline__event--tertiary {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-day-timeline__event--surface {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.m3-day-timeline__time {
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.m3-day-timeline__now {
  position: absolute;
  inset-inline: -6px 0;
  top: var(--m3-day-timeline-top);
  z-index: 1;
  height: 2px;
  margin-top: -1px;
  background: var(--md-sys-color-primary);
  pointer-events: none;
}

.m3-day-timeline__now::before {
  content: "";
  position: absolute;
  inset-inline-start: 0;
  top: -5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
}

@media (prefers-reduced-motion: no-preference) {
  .m3-day-timeline__slot {
    animation:
      m3-day-timeline-rise var(--md-sys-motion-spring-default-spatial-duration)
        var(--md-sys-motion-spring-default-spatial) both,
      m3-day-timeline-fade var(--md-sys-motion-spring-default-effects-duration)
        var(--md-sys-motion-spring-default-effects) both;
    animation-delay: calc(min(var(--m3-day-timeline-index), 8) * 30ms);
  }
}

@keyframes m3-day-timeline-rise {
  from {
    transform: translateY(12px) scale(0.96);
  }
}

@keyframes m3-day-timeline-fade {
  from {
    opacity: 0;
  }
}
</style>
