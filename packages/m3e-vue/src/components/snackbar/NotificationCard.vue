<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useDismissDrag } from "../../composables/useDismissDrag.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import type { NotificationItem, NotificationResult } from "../../services/notification.js";
import { dismissDirection, type DismissDirection } from "../../utils/dismiss.js";

const props = defineProps<{
  item: NotificationItem;
  /** Whether its timer runs - the one in front of a collapsed stack, none while expanded. */
  timed: boolean;
  /** Whether it takes touches; cards behind a collapsed stack do not. */
  interactive: boolean;
  closeLabel: string;
  label: string;
}>();

const emit = defineEmits<{ done: [result: NotificationResult] }>();

const reduced = useReducedMotion();
const card = useTemplateRef<HTMLElement>("card");
const motion = MOTION_SCHEMES.expressive;

let x = 0;
let y = 0;
let animation: SpringAnimation | null = null;
let leaving = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let remaining = props.item.durationMs;
let startedAt = 0;

function draw() {
  const element = card.value;
  if (!element) return;
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  element.style.opacity = String(1 - Math.min(1, Math.abs(x) / Math.max(1, element.offsetWidth)));
}

function animateTo(toX: number, toY: number, velocity: number, spatial: "fast" | "default") {
  animation?.stop();
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
      draw();
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

function runTimer() {
  stopTimer();
  if (!props.timed || leaving || !Number.isFinite(remaining)) return;
  startedAt = performance.now();
  timer = setTimeout(() => void dismiss("timeout"), Math.max(remaining, 1500));
}

function pause() {
  if (!timer) return;
  stopTimer();
  remaining = Math.max(0, remaining - (performance.now() - startedAt));
}

async function dismiss(
  result: NotificationResult,
  direction: DismissDirection = "up",
  velocity = 0,
) {
  if (leaving) return;
  leaving = true;
  stopTimer();
  const width = (card.value?.offsetWidth ?? 360) * 1.2;
  const target =
    direction === "up" ? [0, offscreenY()] : [direction === "left" ? -width : width, 0];
  await animateTo(target[0]!, target[1]!, velocity, "fast");
  emit("done", result);
}

watch(
  () => props.timed,
  (timed) => (timed ? runTimer() : pause()),
);

onMounted(() => {
  y = offscreenY();
  draw();
  void animateTo(0, 0, 0, "default");
  runTimer();
});

useDismissDrag({
  target: card,
  enabled: () => props.interactive && !leaving,
  onStart() {
    animation?.stop();
    pause();
  },
  onMove(dx, dy) {
    x = dx;
    y = dy;
    draw();
  },
  onRelease(dx, dy, vx, vy) {
    const direction = dismissDirection({ dx, dy, vx, vy, width: card.value?.offsetWidth ?? 360 });
    if (direction) {
      void dismiss("dismissed", direction, direction === "up" ? -vy : Math.abs(vx));
      return;
    }
    void animateTo(0, 0, 0, "fast");
    runTimer();
  },
});

onBeforeUnmount(() => {
  stopTimer();
  animation?.stop();
});

defineExpose({ dismiss });
</script>

<template>
  <div
    ref="card"
    class="m3-notification"
    :aria-label="props.label"
    :inert="!props.interactive"
    @pointerdown="pause"
    @pointerup="runTimer"
    @pointercancel="runTimer"
  >
    <button
      v-ripple
      type="button"
      class="m3-notification__body m3-state m3-focus-ring"
      @click="dismiss('opened')"
    >
      <span v-if="props.item.icon" class="m3-notification__icon" aria-hidden="true">
        <component :is="props.item.icon" />
      </span>
      <span class="m3-notification__text">
        <span v-if="props.item.source || props.item.meta" class="m3-notification__source">
          {{ props.item.source }}<template v-if="props.item.source && props.item.meta"> · </template
          >{{ props.item.meta }}
        </span>
        <span class="m3-notification__title">{{ props.item.title }}</span>
        <span v-if="props.item.text" class="m3-notification__message">{{ props.item.text }}</span>
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
</template>

<style scoped>
.m3-notification {
  position: relative;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  width: 100%;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level3);
  transform: translate3d(0, -200%, 0);
  touch-action: none;
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
