<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from "vue";

const props = defineProps<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  gradient: string;
  thumb: string;
  valueText: string;
}>();

const emit = defineEmits<{ change: [value: number] }>();

const track = useTemplateRef<HTMLElement>("track");
const dragging = shallowRef(false);
const ratio = computed(() =>
  Math.min(1, Math.max(0, (props.value - props.min) / (props.max - props.min || 1))),
);

const clamp = (value: number) => Math.min(props.max, Math.max(props.min, value));

function at(event: PointerEvent) {
  const element = track.value;
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const offset = (event.clientX - rect.left) / (rect.width || 1);
  emit("change", clamp(props.min + offset * (props.max - props.min)));
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  track.value?.setPointerCapture(event.pointerId);
  dragging.value = true;
  at(event);
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) at(event);
}

function onKeydown(event: KeyboardEvent) {
  const big = (props.max - props.min) / 10;
  const moves: Record<string, number> = {
    ArrowUp: props.step,
    ArrowDown: -props.step,
    ArrowRight: props.step,
    ArrowLeft: -props.step,
    PageUp: big,
    PageDown: -big,
  };
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    emit("change", event.key === "Home" ? props.min : props.max);
    return;
  }
  const delta = moves[event.key];
  if (delta === undefined) return;
  event.preventDefault();
  emit("change", clamp(props.value + delta));
}
</script>

<template>
  <div class="m3-color-channel">
    <span class="m3-color-channel__label">{{ props.label }}</span>
    <div
      ref="track"
      class="m3-color-channel__track m3-focus-ring"
      role="slider"
      tabindex="0"
      :aria-label="props.label"
      :aria-valuemin="props.min"
      :aria-valuemax="props.max"
      :aria-valuenow="Math.round(props.value)"
      :aria-valuetext="props.valueText"
      :style="{ background: props.gradient }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="dragging = false"
      @pointercancel="dragging = false"
      @keydown="onKeydown"
    >
      <span
        class="m3-color-channel__thumb"
        :class="{ 'm3-color-channel__thumb--dragging': dragging }"
        :style="{ left: `${ratio * 100}%`, background: props.thumb }"
      />
    </div>
  </div>
</template>

<style scoped>
.m3-color-channel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m3-color-channel__label {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
}

.m3-color-channel__track {
  position: relative;
  height: 32px;
  margin: 0 14px;
  border-radius: var(--md-sys-shape-corner-full);
  direction: ltr;
  touch-action: pan-y;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-color-channel__thumb {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  border: 4px solid var(--md-sys-color-surface-container-lowest);
  border-radius: var(--md-sys-shape-corner-full);
  box-shadow: var(--md-sys-elevation-level1);
  transform: translate(-50%, -50%);
  transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
  pointer-events: none;
}

.m3-color-channel__thumb--dragging {
  transform: translate(-50%, -50%) scale(1.2);
}
</style>
