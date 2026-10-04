<script setup lang="ts">
import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from "vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";
import { useHaptics } from "../../composables/services.js";
import { useSheetGesture } from "../../composables/useSheetGesture.js";

/**
 * The modal bottom sheet, driven by a spring rather than a CSS transition, so a drag hands its
 * release velocity to the settle and an interrupted open reverses without a jump. Drag from the
 * handle, or from content scrolled to its top; a fling or half the height dismisses. Escape,
 * Android back and the scrim close it unless `dismissible` is false. `contentDrag: false` limits the
 * drag to the handle and header, for sheets whose content scrolls on its own - wheels, long lists. Slots: `header`, default
 * (scrolls) and `footer` (stays put).
 *
 * @see https://m3.material.io/components/bottom-sheets/specs
 * @see https://m3.material.io/components/bottom-sheets/guidelines
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    dismissible?: boolean;
    handle?: boolean;
    label?: string;
    teleport?: string | HTMLElement;
    contentDrag?: boolean;
  }>(),
  { dismissible: true, handle: true, teleport: "body", contentDrag: true },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ opened: []; closed: [] }>();

const sheet = useTemplateRef<HTMLElement>("sheet");
const scrim = useTemplateRef<HTMLElement>("scrim");
const handleZone = useTemplateRef<HTMLElement>("handleZone");
const header = useTemplateRef<HTMLElement>("header");
const rendered = shallowRef(false);
const settledOpen = shallowRef(false);
const reduced = useReducedMotion();
const haptics = useHaptics();
const titleId = useId();
const spring = MOTION_SCHEMES.expressive.defaultSpatial.spring;
const DISMISS_VELOCITY = 800;

let offset = 0;
let height = 1;
let animation: SpringAnimation | null = null;
let releaseVelocity = 0;
let pastThreshold = false;

useOverlay({ open, dismissible: () => props.dismissible, onClose: () => (open.value = false) });
useFocusTrap(sheet, settledOpen);

function measure() {
  height = Math.max(1, sheet.value?.offsetHeight ?? 1);
}

function place(y: number) {
  offset = y;
  if (sheet.value) sheet.value.style.transform = `translate3d(0, ${y}px, 0)`;
  if (scrim.value) scrim.value.style.opacity = String(Math.min(1, Math.max(0, 1 - y / height)));
}

function animateTo(target: number, velocity = 0): Promise<boolean> {
  animation?.stop();
  animation = animateSpring({
    from: offset,
    to: target,
    spring,
    velocity,
    instant: reduced.value,
    onFrame: place,
  });
  return animation.finished;
}

async function show() {
  rendered.value = true;
  await nextTick();
  measure();
  if (offset === 0 || !animation) place(height);
  if (await animateTo(0)) {
    settledOpen.value = true;
    emit("opened");
  }
}

async function hide() {
  settledOpen.value = false;
  measure();
  const velocity = releaseVelocity;
  releaseVelocity = 0;
  if ((await animateTo(height, velocity)) && !open.value) {
    rendered.value = false;
    emit("closed");
  }
}

watch(
  open,
  (value) => {
    if (value) void show();
    else if (rendered.value) void hide();
  },
  { immediate: true },
);

useSheetGesture({
  sheet,
  surfaces: () => (props.contentDrag ? [sheet.value] : [handleZone.value, header.value]),
  enabled: () => open.value && props.dismissible,
  onDragStart() {
    animation?.stop();
    measure();
    pastThreshold = offset > height / 2;
    return offset;
  },
  onDrag(y) {
    place(y);
    const past = y > height / 2;
    if (past !== pastThreshold) {
      pastThreshold = past;
      haptics.tick();
    }
  },
  onRelease(y, velocity) {
    if (y > height / 2 || velocity > DISMISS_VELOCITY) {
      releaseVelocity = Math.max(0, velocity);
      open.value = false;
    } else {
      void animateTo(0, velocity);
    }
  },
});

function onScrim() {
  if (props.dismissible) open.value = false;
}

onBeforeUnmount(() => animation?.stop());
</script>

<template>
  <Teleport :to="props.teleport">
    <div v-if="rendered" class="m3-sheet-layer">
      <div ref="scrim" class="m3-sheet-layer__scrim" aria-hidden="true" @click="onScrim" />
      <section
        ref="sheet"
        class="m3-bottom-sheet"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="props.title ? titleId : undefined"
        :aria-label="props.title ? undefined : props.label"
      >
        <div
          v-if="props.handle"
          ref="handleZone"
          class="m3-bottom-sheet__handle-zone"
          data-sheet-handle
        >
          <span class="m3-bottom-sheet__handle" />
        </div>
        <header
          v-if="props.title || $slots.header"
          ref="header"
          class="m3-bottom-sheet__header"
          data-sheet-handle
        >
          <slot name="header">
            <h2 :id="titleId" class="m3-bottom-sheet__title">{{ props.title }}</h2>
          </slot>
        </header>
        <div class="m3-bottom-sheet__body"><slot /></div>
        <footer v-if="$slots.footer" class="m3-bottom-sheet__footer"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.m3-sheet-layer {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.m3-sheet-layer__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
  opacity: 0;
  -webkit-tap-highlight-color: transparent;
}

.m3-bottom-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 640px;
  max-height: calc(100% - max(72px, env(safe-area-inset-top) + 56px));
  padding-bottom: env(safe-area-inset-bottom);
  border-radius: 28px 28px 0 0;
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level1);
  transform: translate3d(0, 100%, 0);
  --m3-segmented-container: var(--md-sys-color-surface-container);
  will-change: transform;
  outline: none;
}

.m3-bottom-sheet::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: calc(100% - 1px);
  height: 100vh;
  background: inherit;
  pointer-events: none;
}

.m3-bottom-sheet__handle-zone {
  display: grid;
  flex: none;
  place-items: center;
  height: 48px;
  cursor: grab;
  touch-action: none;
}

.m3-bottom-sheet__handle {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: var(--md-sys-color-on-surface-variant);
  opacity: 0.4;
}

.m3-bottom-sheet__header {
  flex: none;
  padding: 4px 24px 16px;
}

.m3-bottom-sheet__handle-zone + .m3-bottom-sheet__header {
  padding-top: 0;
}

.m3-bottom-sheet__title {
  margin: 0;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
}

.m3-bottom-sheet__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 16px;
}

.m3-bottom-sheet__footer {
  flex: none;
  padding: 8px 24px 16px;
}
</style>
