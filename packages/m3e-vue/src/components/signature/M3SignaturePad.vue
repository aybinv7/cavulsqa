<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { useElementSize } from "../../composables/useElementSize.js";
import {
  strokesToSvg,
  strokeWidth,
  type SignaturePoint,
  type SignatureStroke,
} from "../../utils/signature.js";

/**
 * A pad to sign on with a finger or a pen - proof of delivery, a customer's agreement to an
 * order. The line is ink-like: heavier where it is slow or pressed, thinner on a flick, smoothed
 * through every sample the screen reports. `v-model:strokes` holds what was drawn as fractions of
 * the pad, so it survives a resize or a rotation, can be kept as a draft (`useFormDraft`) and is
 * redrawn sharp at any density. Export with the exposed `toDataURL()` - a PNG on `background`, for
 * an upload - or `toSvg()`; `undo()` and `clear()` edit it.
 *
 * Signing is a pointer gesture; give keyboard and screen-reader users another way to agree, such
 * as typing their name, beside it.
 */
const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    height?: number;
    minWidth?: number;
    maxWidth?: number;
    disabled?: boolean;
  }>(),
  {
    label: "Signature",
    placeholder: "Sign here",
    height: 200,
    minWidth: 1,
    maxWidth: 3.5,
    disabled: false,
  },
);

const strokes = defineModel<SignatureStroke[]>("strokes", { default: () => [] });
const emit = defineEmits<{ begin: []; end: [] }>();

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const { width } = useElementSize(canvas);
const drawing = shallowRef(false);
const empty = computed(() => strokes.value.length === 0 && !drawing.value);
let committed: SignatureStroke[] = strokes.value;
let current: SignatureStroke = [];
let lastWidth: number | undefined;
let committing = false;
let pointer = -1;
let box = { width: 0, height: 0 };

const size = () => ({ width: width.value, height: props.height });
const range = () => ({ min: props.minWidth, max: props.maxWidth });

function context(): CanvasRenderingContext2D | null {
  const element = canvas.value;
  const ctx = element?.getContext("2d") ?? null;
  if (ctx && element) {
    ctx.strokeStyle = ctx.fillStyle = getComputedStyle(element).color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }
  return ctx;
}

const at = (point: SignaturePoint) => ({ x: point.x * width.value, y: point.y * props.height });

function dot(ctx: CanvasRenderingContext2D, point: SignaturePoint) {
  const { x, y } = at(point);
  ctx.beginPath();
  ctx.arc(x, y, (props.minWidth + props.maxWidth) / 4, 0, Math.PI * 2);
  ctx.fill();
}

function segment(
  ctx: CanvasRenderingContext2D,
  stroke: SignatureStroke,
  index: number,
  previous?: number,
) {
  const a = stroke[index - 2] ?? stroke[index - 1]!;
  const b = stroke[index - 1]!;
  const c = stroke[index]!;
  const lineWidth = strokeWidth(b, c, size(), range(), previous);
  const start = at(a);
  const control = at(b);
  const end = at(c);
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo((start.x + control.x) / 2, (start.y + control.y) / 2);
  ctx.quadraticCurveTo(control.x, control.y, (control.x + end.x) / 2, (control.y + end.y) / 2);
  ctx.stroke();
  return lineWidth;
}

function redraw() {
  const element = canvas.value;
  if (!element || width.value === 0) return;
  const ratio = window.devicePixelRatio || 1;
  element.width = Math.round(width.value * ratio);
  element.height = Math.round(props.height * ratio);
  const ctx = context();
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  for (const stroke of committed) {
    if (stroke.length === 1) dot(ctx, stroke[0]!);
    let previous: number | undefined;
    for (let index = 1; index < stroke.length; index += 1)
      previous = segment(ctx, stroke, index, previous);
  }
}

function sample(event: PointerEvent): SignaturePoint | null {
  const element = canvas.value;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    t: event.timeStamp,
    pressure: event.pointerType === "pen" ? event.pressure : 0.5,
  };
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || pointer !== -1 || event.button !== 0) return;
  const point = sample(event);
  const ctx = context();
  if (!point || !ctx) return;
  pointer = event.pointerId;
  const rect = canvas.value!.getBoundingClientRect();
  box = { width: rect.width, height: rect.height };
  canvas.value?.setPointerCapture(event.pointerId);
  current = [point];
  lastWidth = undefined;
  drawing.value = true;
  dot(ctx, point);
  emit("begin");
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  const ctx = context();
  if (!ctx) return;
  const events = event.getCoalescedEvents?.() ?? [];
  for (const each of events.length ? events : [event]) {
    const point = sample(each);
    if (!point) continue;
    const last = current.at(-1)!;
    if (
      Math.abs(point.x - last.x) * box.width < 0.5 &&
      Math.abs(point.y - last.y) * box.height < 0.5
    )
      continue;
    current.push(point);
    lastWidth = segment(ctx, current, current.length - 1, lastWidth);
  }
}

function finish(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  pointer = -1;
  drawing.value = false;
  if (current.length === 0) return;
  committing = true;
  committed = [...committed, current];
  strokes.value = committed;
  current = [];
  emit("end");
}

function clear() {
  strokes.value = [];
}

function undo() {
  strokes.value = committed.slice(0, -1);
}

function toSvg(color?: string): string {
  const ink = color ?? (canvas.value ? getComputedStyle(canvas.value).color : "#000");
  return strokesToSvg(committed, size(), {
    color: ink,
    width: (props.minWidth + props.maxWidth) / 2,
  });
}

/** A PNG (or `type`) of the signature at the screen's density; `background` fills behind the ink. */
function toDataURL(type = "image/png", background?: string): string {
  const element = canvas.value;
  if (!element) return "";
  if (!background) return element.toDataURL(type);
  const copy = document.createElement("canvas");
  copy.width = element.width;
  copy.height = element.height;
  const ctx = copy.getContext("2d");
  if (!ctx) return element.toDataURL(type);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, copy.width, copy.height);
  ctx.drawImage(element, 0, 0);
  return copy.toDataURL(type);
}

watch(strokes, (value) => {
  if (committing) {
    committing = false;
    return;
  }
  committed = value;
  redraw();
});

watch([width, () => props.height], redraw, { flush: "post" });

onBeforeUnmount(() => {
  pointer = -1;
});

defineExpose({ clear, undo, toSvg, toDataURL, isEmpty: () => committed.length === 0 });
</script>

<template>
  <div class="m3-signature" :class="{ 'm3-signature--disabled': props.disabled }">
    <canvas
      ref="canvas"
      class="m3-signature__canvas"
      role="img"
      :aria-label="props.label"
      :style="{ height: `${props.height}px` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="finish"
      @pointercancel="finish"
      @lostpointercapture="finish"
    />
    <span class="m3-signature__line" aria-hidden="true" />
    <span v-if="empty" class="m3-signature__placeholder" aria-hidden="true">{{
      props.placeholder
    }}</span>
  </div>
</template>

<style scoped>
.m3-signature {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large, 16px);
  background: var(--md-sys-color-surface-container-lowest);
}

.m3-signature--disabled {
  opacity: 0.38;
  pointer-events: none;
}

.m3-signature__canvas {
  display: block;
  width: 100%;
  color: var(--m3-signature-ink, var(--md-sys-color-on-surface));
  touch-action: none;
  cursor: crosshair;
  -webkit-tap-highlight-color: transparent;
}

.m3-signature__line {
  position: absolute;
  inset-inline: 24px;
  bottom: 40px;
  height: 1px;
  background: var(--md-sys-color-outline);
  pointer-events: none;
}

.m3-signature__placeholder {
  position: absolute;
  inset-inline-start: 24px;
  bottom: 48px;
  color: var(--md-sys-color-on-surface-variant);
  pointer-events: none;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
}
</style>
