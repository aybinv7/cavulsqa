<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { onBeforeUnmount, watch } from "vue";
import { useM3eConfig } from "../../services/config.js";
import type { SnackbarItem } from "../../services/snackbar.js";
import { vRipple } from "../../directives/ripple.js";

/**
 * Shows `useSnackbar().show(...)` messages one at a time at the bottom of the screen. The timer
 * pauses while the snackbar is touched or hovered, so nobody loses an action they were reaching
 * for. Raise it above a navigation bar with `--m3-snackbar-offset`. It sits under dialogs and modal
 * sheets, as Compose's does under their windows. Mount it once.
 *
 * @see https://m3.material.io/components/snackbar/specs
 */
const props = withDefaults(
  defineProps<{ closeLabel?: string; teleport?: string | HTMLElement }>(),
  {
    closeLabel: "Dismiss",
    teleport: "body",
  },
);

const { snackbar } = useM3eConfig();
let timer = 0;
let remaining = 0;
let startedAt = 0;

function clear() {
  if (timer) clearTimeout(timer);
  timer = 0;
}

function run(ms: number) {
  clear();
  if (!Number.isFinite(ms)) return;
  remaining = ms;
  startedAt = performance.now();
  timer = window.setTimeout(() => snackbar.settle("timeout"), ms);
}

function pause() {
  if (!timer) return;
  clear();
  remaining = Math.max(0, remaining - (performance.now() - startedAt));
}

function resume() {
  if (snackbar.current.value && !timer && Number.isFinite(remaining))
    run(Math.max(remaining, 1500));
}

watch(
  snackbar.current,
  (item: SnackbarItem | null) => {
    clear();
    if (item) run(item.durationMs);
  },
  { immediate: true },
);

onBeforeUnmount(clear);
</script>

<template>
  <Teleport :to="props.teleport">
    <div class="m3-snackbar-region" role="status" aria-live="polite">
      <Transition name="m3-snackbar" mode="out-in">
        <div
          v-if="snackbar.current.value"
          :key="snackbar.current.value.id"
          class="m3-snackbar"
          :class="{
            'm3-snackbar--action': snackbar.current.value.action || snackbar.current.value.closable,
          }"
          @pointerenter="pause"
          @pointerdown="pause"
          @pointerleave="resume"
          @pointerup="resume"
        >
          <span class="m3-snackbar__message">{{ snackbar.current.value.message }}</span>
          <button
            v-if="snackbar.current.value.action"
            v-ripple
            type="button"
            class="m3-snackbar__action m3-state m3-focus-ring"
            @click="snackbar.settle('action')"
          >
            {{ snackbar.current.value.action }}
          </button>
          <button
            v-if="snackbar.current.value.closable"
            v-ripple
            type="button"
            class="m3-snackbar__close m3-state m3-focus-ring"
            :aria-label="props.closeLabel"
            @click="snackbar.settle('dismissed')"
          >
            <M3Glyph name="close" />
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.m3-snackbar-region {
  position: fixed;
  inset-inline: 0;
  bottom: calc(12px + env(safe-area-inset-bottom) + var(--m3-snackbar-offset, 0px));
  z-index: calc(var(--m3-overlay-z, 12000) - 1);
  display: flex;
  justify-content: center;
  padding: 0 12px;
  pointer-events: none;
  transition: bottom var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-snackbar {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  min-height: 48px;
  padding: 6px 16px;
  border-radius: 4px;
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: var(--md-sys-elevation-level3);
  pointer-events: auto;
}

.m3-snackbar--action {
  padding-inline-end: 8px;
}

.m3-snackbar__message {
  flex: 1;
  padding: 8px 0;
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
  letter-spacing: var(--md-sys-typescale-body-medium-tracking);
}

.m3-snackbar__action {
  flex: none;
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 20px;
  background: none;
  color: var(--md-sys-color-inverse-primary);
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  cursor: pointer;
}

.m3-snackbar__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.m3-snackbar__close svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-snackbar-enter-active {
  transition:
    transform var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects);
}

.m3-snackbar-leave-active {
  transition: opacity var(--md-sys-motion-duration-short3)
    var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-snackbar-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}

.m3-snackbar-leave-to {
  opacity: 0;
}
</style>
