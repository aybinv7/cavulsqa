<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useDismissDrag } from "../../composables/useDismissDrag.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { useM3eConfig } from "../../services/config.js";
import type { NotificationItem, NotificationResult } from "../../services/notification.js";
import { dismissDirection, type DismissDirection } from "../../utils/dismiss.js";

/**
 * Shows `useNotification().show(...)` as Framework7's in-app notification in Material dress: a
 * banner that drops in below the status bar. Tapping it opens it; it flies out sideways or slides
 * up when swiped, following the finger, as Android's heads-up notifications do; its timer pauses
 * while it is touched. A new notification replaces the one showing. Mount it once.
 */
const props = withDefaults(
  defineProps<{ closeLabel?: string; label?: string; teleport?: string | HTMLElement }>(),
  { closeLabel: "Dismiss", label: "Notification", teleport: "body" },
);

const { notification } = useM3eConfig();
const reduced = useReducedMotion();
const card = useTemplateRef<HTMLElement>("card");
const shown = shallowRef<NotificationItem | null>(null);
const motion = MOTION_SCHEMES.expressive;

let x = 0;
let y = 0;
let animation: SpringAnimation | null = null;
let leaving = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let remaining = 0;
let startedAt = 0;

function draw(element: HTMLElement | null | undefined) {
  if (!element) return;
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  element.style.opacity = String(1 - Math.min(1, Math.abs(x) / Math.max(1, element.offsetWidth)));
}

function animateTo(toX: number, toY: number, velocity: number, spatial: "fast" | "default") {
  animation?.stop();
  const element = card.value;
  const fromX = x;
  const fromY = y;
  const distance = Math.hypot(toX - fromX, toY - fromY) || 1;
  animation = animateSpring({
    from: 0,
    to: 1,
    spring: (spatial === "fast" ? motion.fastSpatial : motion.defaultSpatial).spring,
    velocity: velocity / distance,
    instant: reduced.value,
    restDelta: 0.001,
    onFrame(progress) {
      x = fromX + (toX - fromX) * progress;
      y = fromY + (toY - fromY) * progress;
      draw(element);
    },
  });
  return animation.finished;
}

function offscreenY(): number {
  const rect = card.value?.getBoundingClientRect();
  if (!rect) return -200;
  return -(rect.top - y + rect.height + 16);
}

function stopTimer() {
  clearTimeout(timer);
  timer = undefined;
}

function runTimer(ms: number) {
  stopTimer();
  if (!Number.isFinite(ms)) return;
  remaining = ms;
  startedAt = performance.now();
  timer = setTimeout(() => void dismiss("timeout"), ms);
}

function pause() {
  if (!timer) return;
  stopTimer();
  remaining = Math.max(0, remaining - (performance.now() - startedAt));
}

function resume() {
  if (shown.value && !timer && !leaving && Number.isFinite(remaining)) {
    runTimer(Math.max(remaining, 1500));
  }
}

async function enter(item: NotificationItem) {
  await nextTick();
  if (shown.value !== item) return;
  x = 0;
  y = offscreenY();
  draw(card.value);
  runTimer(item.durationMs);
  void animateTo(0, 0, 0, "default");
}

async function dismiss(
  result: NotificationResult,
  direction: DismissDirection = "up",
  velocity = 0,
) {
  const item = shown.value;
  if (!item || leaving) return;
  leaving = true;
  stopTimer();
  const width = (card.value?.offsetWidth ?? 360) * 1.2;
  const target =
    direction === "up" ? [0, offscreenY()] : [direction === "left" ? -width : width, 0];
  await animateTo(target[0]!, target[1]!, velocity, "fast");
  if (shown.value === item) shown.value = null;
  leaving = false;
  if (notification.current.value === item) notification.settle(result);
}

watch(
  notification.current,
  (item) => {
    if (item && item !== shown.value) {
      animation?.stop();
      leaving = false;
      shown.value = item;
      void enter(item);
    } else if (!item && shown.value && !leaving) {
      void dismiss("dismissed");
    }
  },
  { immediate: true },
);

useDismissDrag({
  target: card,
  enabled: () => Boolean(shown.value) && !leaving,
  onStart() {
    animation?.stop();
    pause();
  },
  onMove(dx, dy) {
    x = dx;
    y = dy;
    draw(card.value);
  },
  onRelease(dx, dy, vx, vy) {
    const direction = dismissDirection({
      dx,
      dy,
      vx,
      vy,
      width: card.value?.offsetWidth ?? 360,
    });
    if (direction) {
      void dismiss("dismissed", direction, direction === "up" ? -vy : Math.abs(vx));
    } else {
      void animateTo(0, 0, 0, "fast");
      resume();
    }
  },
});

onBeforeUnmount(() => {
  stopTimer();
  animation?.stop();
});
</script>

<template>
  <Teleport :to="props.teleport">
    <div class="m3-notification-region" role="status" aria-live="polite">
      <div
        v-if="shown"
        :key="shown.id"
        ref="card"
        class="m3-notification"
        :aria-label="props.label"
        @pointerdown="pause"
        @pointerup="resume"
        @pointercancel="resume"
      >
        <button
          v-ripple
          type="button"
          class="m3-notification__body m3-state m3-focus-ring"
          @click="dismiss('opened')"
        >
          <span v-if="shown.icon" class="m3-notification__icon" aria-hidden="true">
            <component :is="shown.icon" />
          </span>
          <span class="m3-notification__text">
            <span v-if="shown.source || shown.meta" class="m3-notification__source">
              {{ shown.source }}<template v-if="shown.source && shown.meta"> · </template
              >{{ shown.meta }}
            </span>
            <span class="m3-notification__title">{{ shown.title }}</span>
            <span v-if="shown.text" class="m3-notification__message">{{ shown.text }}</span>
          </span>
        </button>
        <button
          v-ripple
          type="button"
          class="m3-notification__close m3-state m3-focus-ring"
          :aria-label="props.closeLabel"
          @click="dismiss('dismissed')"
        >
          <M3Glyph name="close" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.m3-notification-region {
  position: fixed;
  inset-inline: 0;
  top: calc(env(safe-area-inset-top) + 8px);
  z-index: calc(var(--m3-overlay-z, 12000) + 10);
  display: flex;
  justify-content: center;
  padding: 0 8px;
  pointer-events: none;
}

.m3-notification {
  position: relative;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level3);
  transform: translate3d(0, -200%, 0);
  touch-action: none;
  pointer-events: auto;
  will-change: transform, opacity;
}

.m3-notification__body {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
  margin: 0;
  padding: 16px 0 16px 16px;
  border: 0;
  border-radius: inherit;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.m3-notification__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-notification__icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.m3-notification__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.m3-notification__source {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-notification__title {
  overflow: hidden;
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-notification__message {
  display: -webkit-box;
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.m3-notification__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  margin: 8px 8px 0 4px;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

.m3-notification__close :deep(svg) {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
