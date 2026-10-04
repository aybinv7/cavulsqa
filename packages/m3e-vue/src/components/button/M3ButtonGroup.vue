<script setup lang="ts">
import { computed, provide, useTemplateRef } from "vue";
import { BUTTON_GROUP } from "./context.js";
import { BUTTON_METRICS, type ButtonSize } from "./sizes.js";

/**
 * A row of buttons or icon buttons that react to each other.
 * - `standard`: a pressed button widens by 15% and its neighbours give way, on the fast spatial
 *   spring, with the size's own spacing (18 / 12 / 8 / 8 / 8).
 * - `connected`: 2dp apart, full outer corners and small inner ones; a selected toggle rounds off
 *   completely. It replaces segmented buttons.
 *
 * @see https://m3.material.io/components/button-groups/specs
 */
const props = withDefaults(
  defineProps<{ variant?: "standard" | "connected"; size?: ButtonSize; label?: string }>(),
  { variant: "standard", size: "s" },
);

const root = useTemplateRef<HTMLElement>("root");
const connected = computed(() => props.variant === "connected");
const metrics = computed(() => BUTTON_METRICS[props.size]);
const EXPANDED_RATIO = 0.15;

provide(BUTTON_GROUP, { size: computed(() => props.size), connected });

const buttons = () =>
  [...(root.value?.children ?? [])].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && /\bm3-(icon-)?button\b/.test(child.className),
  );

function reset() {
  for (const button of buttons()) button.style.removeProperty("--m3-btn-expand");
}

function onPointerDown(event: PointerEvent) {
  if (connected.value || event.button !== 0) return;
  const list = buttons();
  const pressed = list.find((button) => button.contains(event.target as Node));
  if (!pressed || pressed.matches(":disabled, [aria-disabled='true']")) return;
  const index = list.indexOf(pressed);
  const growth = pressed.getBoundingClientRect().width * EXPANDED_RATIO;
  const neighbours = [list[index - 1], list[index + 1]].filter(
    (b): b is HTMLElement => b !== undefined,
  );
  pressed.style.setProperty("--m3-btn-expand", `${growth / 2}px`);
  for (const neighbour of neighbours) {
    neighbour.style.setProperty("--m3-btn-expand", `${-growth / neighbours.length / 2}px`);
  }
}
</script>

<template>
  <div
    ref="root"
    class="m3-button-group"
    :class="{ 'm3-button-group--connected': connected }"
    role="group"
    :aria-label="props.label"
    :style="{
      gap: connected ? '2px' : `${metrics.groupGap}px`,
      '--m3-group-inner': `${metrics.connectedInner}px`,
    }"
    @pointerdown="onPointerDown"
    @pointerup="reset"
    @pointercancel="reset"
    @pointerleave="reset"
  >
    <slot />
  </div>
</template>

<style scoped>
.m3-button-group {
  display: flex;
  align-items: center;
}

.m3-button-group--connected {
  width: 100%;
}

.m3-button-group--connected > :deep(.m3-button),
.m3-button-group--connected > :deep(.m3-icon-button) {
  flex: 1 1 0;
  min-width: 48px;
}

.m3-button-group--connected > :deep(:not(:first-child)) {
  --m3-btn-start: var(--m3-group-inner);
}

.m3-button-group--connected > :deep(:not(:last-child)) {
  --m3-btn-end: var(--m3-group-inner);
}

.m3-button-group--connected.m3-button-group--connected > :deep([data-pressed]) {
  --m3-btn-start: var(--m3-btn-pressed);
  --m3-btn-end: var(--m3-btn-pressed);
}

.m3-button-group--connected.m3-button-group--connected > :deep([aria-pressed="true"]) {
  --m3-btn-start: var(--m3-btn-round);
  --m3-btn-end: var(--m3-btn-round);
}
</style>
