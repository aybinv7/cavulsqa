<script setup lang="ts">
import M3Fab from "./M3Fab.vue";
import { computed, nextTick, onScopeDispose, shallowRef, useId, useTemplateRef, watch } from "vue";
import { useOverlay } from "../../composables/useOverlay.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import type { FabColor } from "./fab.js";

/**
 * Framework7's FAB morph as a Material container transform: the FAB grows into the surface it
 * opens - a floating toolbar of actions (`variant="toolbar"`) or a panel of content (`panel`, with
 * a scrim) - and shrinks back into the FAB on close. The surface keeps the FAB's colour and starts
 * as its exact shape at its exact corner, so there is no seam; only the outline moves, on the
 * compositor. A tap outside, Escape or Android back close it, and focus returns to the FAB.
 *
 * Put it where a FAB goes (`AppPage`'s `#fab`). The FAB's icon goes in `#icon`; the surface's
 * content in the default slot, which receives `{ close }` for actions that finish the task.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    variant?: "toolbar" | "panel";
    color?: FabColor;
    surfaceLabel?: string;
    scrim?: boolean;
  }>(),
  { variant: "panel", color: "primary-container", scrim: undefined },
);

const open = defineModel<boolean>("open", { default: false });
defineSlots<{ icon?: () => unknown; default?: (scope: { close: () => void }) => unknown }>();

const FAB = 56;
const FAB_RADIUS = 16;
const id = useId();
const root = useTemplateRef<HTMLElement>("root");
const surface = useTemplateRef<HTMLElement>("surface");
const reduced = useReducedMotion();
const rendered = shallowRef(false);
const showScrim = computed(() => props.scrim ?? props.variant === "panel");
let animation: Animation | null = null;

const { layer } = useOverlay({ open, dismissible: true, onClose: () => (open.value = false) });

const close = () => (open.value = false);

function collapsed(element: HTMLElement): string {
  const { width, height } = element.getBoundingClientRect();
  const rtl = getComputedStyle(element).direction === "rtl";
  const top = Math.max(0, height - FAB);
  const side = Math.max(0, width - FAB);
  return rtl
    ? `inset(${top}px ${side}px 0px 0px round ${FAB_RADIUS}px)`
    : `inset(${top}px 0px 0px ${side}px round ${FAB_RADIUS}px)`;
}

function morph(element: HTMLElement, opening: boolean): Promise<void> {
  animation?.cancel();
  const radius = getComputedStyle(element).borderTopLeftRadius;
  const from = collapsed(element);
  const to = `inset(0px 0px 0px 0px round ${radius})`;
  const content = element.firstElementChild as HTMLElement | null;
  if (reduced.value || typeof element.animate !== "function") {
    element.style.clipPath = opening ? "" : from;
    return Promise.resolve();
  }
  animation = element.animate(
    { clipPath: opening ? [from, to] : [to, from] },
    {
      duration: opening ? 450 : 300,
      easing: opening ? "cubic-bezier(0.05, 0.7, 0.1, 1)" : "cubic-bezier(0.3, 0, 0.8, 0.15)",
    },
  );
  content?.animate(
    { opacity: opening ? [0, 1] : [1, 0] },
    { duration: opening ? 250 : 120, delay: opening ? 120 : 0, fill: "both" },
  );
  return animation.finished.then(
    () => undefined,
    () => undefined,
  );
}

function onPointerDown(event: PointerEvent) {
  if (root.value?.contains(event.target as Node)) return;
  open.value = false;
}

watch(open, async (value) => {
  if (value) {
    rendered.value = true;
    await nextTick();
    const element = surface.value;
    if (!element || !open.value) return;
    document.addEventListener("pointerdown", onPointerDown, true);
    const target =
      element.querySelector<HTMLElement>("button:not([disabled]), [href], input, [tabindex]") ??
      element;
    target.focus({ preventScroll: true });
    await morph(element, true);
    return;
  }
  document.removeEventListener("pointerdown", onPointerDown, true);
  const element = surface.value;
  const hadFocus = !!element?.contains(document.activeElement);
  if (element) await morph(element, false);
  if (open.value) return;
  rendered.value = false;
  if (!hadFocus) return;
  await nextTick();
  root.value?.querySelector<HTMLElement>(".m3-fab")?.focus({ preventScroll: true });
});

onScopeDispose(() => {
  animation?.cancel();
  document.removeEventListener("pointerdown", onPointerDown, true);
});
</script>

<template>
  <div
    ref="root"
    class="m3-fab-morph"
    :class="[`m3-fab-morph--${props.variant}`, `m3-fab-morph--${props.color}`]"
    :style="rendered ? layer : undefined"
  >
    <Transition name="m3-fab-morph-scrim">
      <div v-if="showScrim && open" class="m3-fab-morph__scrim" aria-hidden="true" />
    </Transition>
    <M3Fab
      :label="props.label"
      :color="props.color"
      :class="{ 'm3-fab-morph__fab--hidden': rendered }"
      :aria-expanded="open"
      :aria-controls="id"
      @click="open = !open"
    >
      <slot name="icon" />
    </M3Fab>
    <div
      v-if="rendered"
      :id="id"
      ref="surface"
      class="m3-fab-morph__surface"
      :role="props.variant === 'toolbar' ? 'toolbar' : 'dialog'"
      :aria-label="props.surfaceLabel ?? props.label"
      tabindex="-1"
    >
      <div class="m3-fab-morph__content"><slot :close="close" /></div>
    </div>
  </div>
</template>

<style scoped>
.m3-fab-morph {
  position: relative;
  z-index: var(--m3-overlay-z, auto);
}

.m3-fab-morph__fab--hidden {
  visibility: hidden;
}

.m3-fab-morph__scrim {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
}

.m3-fab-morph__surface {
  position: absolute;
  inset-inline-end: 0;
  bottom: 0;
  box-sizing: border-box;
  overflow: hidden;
  outline: none;
  box-shadow: var(--md-sys-elevation-level3);
  will-change: clip-path;
}

.m3-fab-morph--toolbar .m3-fab-morph__surface {
  width: min(calc(100vw - 32px), var(--m3-fab-morph-width, 412px));
  height: 64px;
  border-radius: 32px;
}

.m3-fab-morph--panel .m3-fab-morph__surface {
  width: min(calc(100vw - 32px), var(--m3-fab-morph-width, 360px));
  max-height: calc(100dvh - 160px);
  overflow-y: auto;
  border-radius: var(--md-sys-shape-corner-extra-large, 28px);
}

.m3-fab-morph__content {
  height: 100%;
}

.m3-fab-morph--toolbar .m3-fab-morph__content {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 4px;
  padding: 0 8px;
}

.m3-fab-morph--primary-container .m3-fab-morph__surface {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-fab-morph--secondary-container .m3-fab-morph__surface {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-fab-morph--tertiary-container .m3-fab-morph__surface {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-fab-morph--primary .m3-fab-morph__surface {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-fab-morph--secondary .m3-fab-morph__surface {
  background: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}

.m3-fab-morph--tertiary .m3-fab-morph__surface {
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}

.m3-fab-morph-scrim-enter-active,
.m3-fab-morph-scrim-leave-active {
  transition: opacity var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
}

.m3-fab-morph-scrim-enter-from,
.m3-fab-morph-scrim-leave-to {
  opacity: 0;
}
</style>
