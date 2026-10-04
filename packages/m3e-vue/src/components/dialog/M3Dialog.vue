<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from "vue";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";

/**
 * The basic dialog: 28dp corners on `surface-container-high`, an optional hero icon that centres
 * the headline, supporting content and right-aligned actions. It grows in from its centre on the
 * emphasized-decelerate curve and leaves faster than it came. Escape, Android back and the scrim
 * close it unless `dismissible` is false.
 *
 * @see https://m3.material.io/components/dialogs/specs
 */
const props = withDefaults(
  defineProps<{
    headline?: string;
    dismissible?: boolean;
    teleport?: string | HTMLElement;
    role?: "dialog" | "alertdialog";
  }>(),
  { dismissible: true, teleport: "body", role: "dialog" },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ closed: [] }>();
const panel = useTemplateRef<HTMLElement>("panel");
const settled = shallowRef(false);
const headlineId = useId();

useOverlay({ open, dismissible: () => props.dismissible, onClose: () => (open.value = false) });
useFocusTrap(panel, settled);

function onScrim() {
  if (props.dismissible) open.value = false;
}
</script>

<template>
  <Teleport :to="props.teleport">
    <Transition
      name="m3-dialog"
      @after-enter="settled = true"
      @before-leave="settled = false"
      @after-leave="emit('closed')"
    >
      <div v-if="open" class="m3-dialog-layer">
        <div class="m3-dialog-layer__scrim" aria-hidden="true" @click="onScrim" />
        <div
          ref="panel"
          class="m3-dialog"
          :class="{ 'm3-dialog--icon': $slots.icon }"
          :role="props.role"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="props.headline ? headlineId : undefined"
        >
          <span v-if="$slots.icon" class="m3-dialog__icon" aria-hidden="true"
            ><slot name="icon"
          /></span>
          <h2 v-if="props.headline" :id="headlineId" class="m3-dialog__headline">
            {{ props.headline }}
          </h2>
          <div class="m3-dialog__content"><slot /></div>
          <div v-if="$slots.actions" class="m3-dialog__actions"><slot name="actions" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  display: grid;
  place-items: center;
  padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
}

.m3-dialog-layer__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
}

.m3-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-width: 280px;
  max-width: 560px;
  max-height: 100%;
  padding: 24px;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  outline: none;
}

.m3-dialog__icon {
  display: grid;
  place-items: center;
  align-self: center;
  margin-bottom: 16px;
  color: var(--md-sys-color-secondary);
  font-size: 24px;
}

.m3-dialog__icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.m3-dialog__headline {
  margin: 0 0 16px;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) /
    var(--md-sys-typescale-headline-small-line-height) var(--md-sys-typescale-headline-small-font);
}

.m3-dialog--icon .m3-dialog__headline {
  text-align: center;
}

.m3-dialog__content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
  letter-spacing: var(--md-sys-typescale-body-medium-tracking);
}

.m3-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

.m3-dialog-enter-active .m3-dialog,
.m3-dialog-enter-active .m3-dialog-layer__scrim {
  transition:
    transform var(--md-sys-motion-duration-long2) var(--md-sys-motion-easing-emphasized-decelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.m3-dialog-leave-active .m3-dialog,
.m3-dialog-leave-active .m3-dialog-layer__scrim {
  transition:
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-dialog-enter-active,
.m3-dialog-leave-active {
  transition: opacity var(--md-sys-motion-duration-long2);
}

.m3-dialog-enter-from .m3-dialog,
.m3-dialog-leave-to .m3-dialog {
  opacity: 0;
  transform: scale(0.85);
}

.m3-dialog-enter-from .m3-dialog-layer__scrim,
.m3-dialog-leave-to .m3-dialog-layer__scrim {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .m3-dialog-enter-from .m3-dialog,
  .m3-dialog-leave-to .m3-dialog {
    transform: none;
  }
}
</style>
