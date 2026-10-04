<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef } from "vue";
import { placeBeside, type AnchoredPosition } from "../../composables/useAnchoredPosition.js";

/**
 * Plain or rich tooltip. Plain: a short label on `inverse-surface` for a control whose icon needs
 * words - shown on hover or keyboard focus, and on touch by a long press, then hidden 1.5 s after
 * the finger lifts. Rich: a title, supporting text and optional actions on `surface-container`,
 * opened by a tap on the trigger and closed by a tap anywhere else.
 *
 * The trigger goes in the default slot; the tooltip describes it through `aria-describedby`.
 *
 * @see https://m3.material.io/components/tooltips/specs
 */
const props = withDefaults(
  defineProps<{
    text: string;
    title?: string;
    rich?: boolean;
    side?: "top" | "bottom";
    teleport?: string | HTMLElement;
  }>(),
  { rich: false, side: "top", teleport: "body" },
);

const LONG_PRESS_MS = 500;
const TOUCH_LINGER_MS = 1500;
const HOVER_DELAY_MS = 300;

const id = useId();
const trigger = useTemplateRef<HTMLElement>("trigger");
const surface = useTemplateRef<HTMLElement>("surface");
const open = shallowRef(false);
const position = shallowRef<AnchoredPosition>({ top: -9999, left: -9999, side: props.side });
let showTimer = 0;
let hideTimer = 0;

const clearTimers = () => {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
};

async function show() {
  clearTimers();
  if (open.value) return;
  open.value = true;
  await nextTick();
  place();
  if (props.rich) document.addEventListener("pointerdown", onOutside, true);
}

function hide() {
  clearTimers();
  open.value = false;
  document.removeEventListener("pointerdown", onOutside, true);
}

function place() {
  const anchor = trigger.value?.firstElementChild ?? trigger.value;
  const element = surface.value;
  if (!anchor || !element) return;
  position.value = placeBeside(
    anchor.getBoundingClientRect(),
    { width: element.offsetWidth, height: element.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    props.side,
  );
}

function onOutside(event: PointerEvent) {
  const target = event.target as Node;
  if (surface.value?.contains(target) || trigger.value?.contains(target)) return;
  hide();
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === "mouse" || props.rich) return;
  clearTimers();
  showTimer = window.setTimeout(() => void show(), LONG_PRESS_MS);
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerType === "mouse" || props.rich) return;
  window.clearTimeout(showTimer);
  if (open.value) hideTimer = window.setTimeout(hide, TOUCH_LINGER_MS);
}

function onEnter(event: PointerEvent) {
  if (event.pointerType !== "mouse" || props.rich) return;
  clearTimers();
  showTimer = window.setTimeout(() => void show(), HOVER_DELAY_MS);
}

function onLeave(event: PointerEvent) {
  if (event.pointerType !== "mouse" || props.rich) return;
  hide();
}

function onClick() {
  if (!props.rich) return;
  if (open.value) hide();
  else void show();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) {
    event.stopPropagation();
    hide();
  }
}

onBeforeUnmount(hide);
</script>

<template>
  <span
    ref="trigger"
    class="m3-tooltip-trigger"
    :aria-describedby="open ? id : undefined"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
    @focusin="!props.rich && show()"
    @focusout="!props.rich && hide()"
    @click.capture="onClick"
    @keydown="onKeydown"
    @contextmenu="(event) => !props.rich && event.preventDefault()"
  >
    <slot />
  </span>
  <Teleport :to="props.teleport">
    <Transition name="m3-tooltip">
      <div
        v-if="open"
        :id="id"
        ref="surface"
        class="m3-tooltip"
        :class="[
          props.rich ? 'm3-tooltip--rich' : 'm3-tooltip--plain',
          `m3-tooltip--${position.side}`,
        ]"
        :role="props.rich ? 'dialog' : 'tooltip'"
        :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      >
        <strong v-if="props.rich && props.title" class="m3-tooltip__title">{{
          props.title
        }}</strong>
        <span class="m3-tooltip__text">{{ props.text }}</span>
        <div v-if="props.rich && $slots.actions" class="m3-tooltip__actions">
          <slot name="actions" :close="hide" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-tooltip-trigger {
  display: inline-flex;
  -webkit-touch-callout: none;
}

.m3-tooltip {
  position: fixed;
  z-index: calc(var(--m3-overlay-z, 12000) + 20);
  box-sizing: border-box;
  pointer-events: none;
}

.m3-tooltip--plain {
  max-width: 200px;
  min-height: 24px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-tooltip--rich {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 312px;
  padding: 12px 16px 8px;
  border-radius: 12px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: var(--md-sys-elevation-level2);
  pointer-events: auto;
}

.m3-tooltip__title {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-tooltip--rich .m3-tooltip__text {
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-tooltip__actions {
  display: flex;
  gap: 8px;
  margin-inline-start: -12px;
  padding-top: 4px;
}

.m3-tooltip-enter-active {
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-tooltip-leave-active {
  transition: opacity var(--md-sys-motion-duration-short2)
    var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-tooltip-enter-from,
.m3-tooltip-leave-to {
  opacity: 0;
}

.m3-tooltip--top.m3-tooltip-enter-from {
  transform: translateY(4px) scale(0.92);
}

.m3-tooltip--bottom.m3-tooltip-enter-from {
  transform: translateY(-4px) scale(0.92);
}
</style>
