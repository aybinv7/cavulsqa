<script setup lang="ts">
import { nextTick, onScopeDispose, shallowRef, useTemplateRef, watch } from "vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";
import {
  placePopover,
  type PopoverAlign,
  type PopoverPlacement,
  type PopoverSide,
} from "../../utils/popoverPlacement.js";

/**
 * Framework7's popover in Material 3: any content on a floating surface, pointing at the element
 * that opened it. It opens below the anchor (or above, `side="top"`), flips when there is no room,
 * stays inside the screen and grows out of the anchor. A tap outside, Escape or Android back close
 * it, and focus returns to the anchor. Moving focus out of it closes it too, unless it is `modal`:
 * then a scrim dims the page and focus stays inside until it closes.
 *
 * Reach for it for a few related controls or a short explanation tied to one element - filters
 * for a column, a quantity editor, help for a field. A list of actions is an `M3Menu`; a task with
 * its own steps is a dialog or a sheet.
 */
const props = withDefaults(
  defineProps<{
    anchor: HTMLElement | null | undefined;
    label: string;
    side?: PopoverSide;
    align?: PopoverAlign;
    modal?: boolean;
    teleport?: string | HTMLElement;
  }>(),
  { side: "bottom", align: "center", modal: false, teleport: "body" },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ closed: [] }>();
const panel = useTemplateRef<HTMLElement>("panel");
const spot = shallowRef<PopoverPlacement | null>(null);
let frame = 0;

const { layer } = useOverlay({ open, dismissible: true, onClose: () => (open.value = false) });
useFocusTrap(panel, () => open.value && props.modal);

function place() {
  frame = 0;
  const anchor = props.anchor;
  const element = panel.value;
  if (!anchor?.isConnected || !element) return;
  spot.value = placePopover(
    anchor.getBoundingClientRect(),
    { width: element.offsetWidth, height: element.scrollHeight },
    { width: window.innerWidth, height: window.innerHeight },
    { side: props.side, align: props.align, rtl: getComputedStyle(anchor).direction === "rtl" },
  );
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(place);
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (panel.value?.contains(target) || props.anchor?.contains(target)) return;
  if (props.modal) return;
  open.value = false;
}

function onFocusOut(event: FocusEvent) {
  if (props.modal) return;
  const next = event.relatedTarget as Node | null;
  if (!next || panel.value?.contains(next) || props.anchor?.contains(next)) return;
  open.value = false;
}

const FOCUSABLE =
  "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";

function returnFocus(anchor: HTMLElement) {
  const target = anchor.matches(FOCUSABLE) ? anchor : anchor.querySelector<HTMLElement>(FOCUSABLE);
  (target ?? anchor).focus({ preventScroll: true });
}

const detach = () => {
  document.removeEventListener("pointerdown", onPointerDown, true);
  window.removeEventListener("resize", schedule);
  window.removeEventListener("scroll", schedule, true);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
};

watch(open, async (value) => {
  if (!value) {
    detach();
    if (!props.modal && props.anchor?.isConnected && panel.value?.contains(document.activeElement))
      returnFocus(props.anchor);
    return;
  }
  spot.value = null;
  await nextTick();
  place();
  if (!props.modal) panel.value?.focus({ preventScroll: true });
  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
});

onScopeDispose(detach);
</script>

<template>
  <Teleport :to="props.teleport">
    <Transition name="m3-popover-scrim">
      <div
        v-if="open && props.modal"
        class="m3-popover-scrim"
        :style="layer"
        aria-hidden="true"
        @click="open = false"
      />
    </Transition>
    <Transition name="m3-popover" @after-leave="emit('closed')">
      <div
        v-if="open"
        ref="panel"
        class="m3-popover"
        role="dialog"
        :aria-label="props.label"
        :aria-modal="props.modal || undefined"
        tabindex="-1"
        :style="[
          layer,
          spot
            ? {
                top: `${spot.top}px`,
                left: `${spot.left}px`,
                maxHeight: `${spot.maxHeight}px`,
                transformOrigin: `${spot.originX}px ${spot.originY}px`,
              }
            : undefined,
        ]"
        @focusout="onFocusOut"
      >
        <slot :close="() => (open = false)" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-popover-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
}

.m3-popover {
  position: fixed;
  top: -9999px;
  left: -9999px;
  z-index: calc(var(--m3-overlay-z, 12000) + 5);
  box-sizing: border-box;
  width: max-content;
  min-width: 112px;
  max-width: min(var(--m3-popover-max-width, 320px), calc(100vw - 16px));
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: var(--md-sys-shape-corner-large, 16px);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level2);
  outline: none;
}

.m3-popover-enter-active {
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-popover-leave-active {
  transition:
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-popover-enter-from,
.m3-popover-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

.m3-popover-scrim-enter-active,
.m3-popover-scrim-leave-active {
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.m3-popover-scrim-enter-from,
.m3-popover-scrim-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .m3-popover-enter-from,
  .m3-popover-leave-to {
    transform: none;
  }
}
</style>
