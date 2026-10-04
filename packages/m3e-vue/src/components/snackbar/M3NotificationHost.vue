<script setup lang="ts">
import NotificationCard from "./NotificationCard.vue";
import { computed, shallowRef, watch } from "vue";
import { useM3eConfig } from "../../services/config.js";
import type { NotificationItem, NotificationResult } from "../../services/notification.js";

/**
 * Shows `useNotification().show(...)` as Framework7's in-app notifications in Material dress:
 * banners that drop in below the status bar and stack, newest in front with the older ones
 * peeking behind, as Android groups heads-up notifications. Tapping one opens it; it flies out
 * sideways or slides up when swiped, following the finger, and the next one rises into place.
 * Only the front one counts down, and only while it is not touched. With more than one, a pill
 * under the stack - or a tap on the cards behind - spreads them into a list to act on each, with
 * "Clear all". Mount it once.
 */
const props = withDefaults(
  defineProps<{
    closeLabel?: string;
    label?: string;
    teleport?: string | HTMLElement;
    moreLabel?: (count: number) => string;
    lessLabel?: string;
    clearLabel?: string;
  }>(),
  {
    closeLabel: "Dismiss",
    label: "Notification",
    teleport: "body",
    moreLabel: (count: number) => `${count} more`,
    lessLabel: "Show less",
    clearLabel: "Clear all",
  },
);

const PEEK = 3;
const { notification } = useM3eConfig();
const expanded = shallowRef(false);
const items = computed(() => notification.items.value);

function done(item: NotificationItem, result: NotificationResult) {
  notification.settle(result, item.id);
}

function expand() {
  if (items.value.length > 1) expanded.value = true;
}

watch(
  () => items.value.length,
  (count) => {
    if (count <= 1) expanded.value = false;
  },
);
</script>

<template>
  <Teleport :to="props.teleport">
    <div
      class="m3-notification-region"
      :class="{ 'm3-notification-region--expanded': expanded }"
      role="status"
      aria-live="polite"
    >
      <div
        class="m3-notification-stack"
        :style="{ '--m3-peeks': Math.min(PEEK, items.length) - 1 }"
      >
        <div
          v-for="(item, depth) in items"
          :key="item.id"
          class="m3-notification-slot"
          :class="{ 'm3-notification-slot--hidden': !expanded && depth >= PEEK }"
          :style="{ '--m3-depth': depth, zIndex: items.length - depth }"
          @click="depth > 0 && !expanded ? expand() : undefined"
        >
          <NotificationCard
            :item="item"
            :timed="!expanded && depth === 0"
            :interactive="expanded || depth === 0"
            :close-label="props.closeLabel"
            :label="props.label"
            @done="done(item, $event)"
          />
        </div>
      </div>
      <div v-if="items.length > 1" class="m3-notification-actions">
        <button
          type="button"
          class="m3-notification-pill m3-state m3-focus-ring"
          :aria-expanded="expanded"
          @click="expanded ? (expanded = false) : expand()"
        >
          {{ expanded ? props.lessLabel : props.moreLabel(items.length - 1) }}
        </button>
        <button
          v-if="expanded"
          type="button"
          class="m3-notification-pill m3-state m3-focus-ring"
          @click="notification.clear()"
        >
          {{ props.clearLabel }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.m3-notification-region {
  position: fixed;
  inset-inline: 0;
  top: calc(env(safe-area-inset-top) + 8px);
  z-index: calc(var(--m3-overlay-z, 12000) + 10);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  pointer-events: none;
}

.m3-notification-stack {
  display: grid;
  width: 100%;
  max-width: 600px;
  padding-bottom: calc(max(0, var(--m3-peeks, 0)) * 10px);
  transition: padding-bottom var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-notification-slot {
  grid-area: 1 / 1;
  align-self: start;
  pointer-events: auto;
  transform: translateY(calc(var(--m3-depth) * 10px)) scale(calc(1 - var(--m3-depth) * 0.05));
  transform-origin: 50% 100%;
  transition:
    transform var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration)
      var(--md-sys-motion-spring-default-effects);
}

.m3-notification-slot--hidden {
  opacity: 0;
  pointer-events: none;
}

.m3-notification-region--expanded .m3-notification-stack {
  display: flex;
  padding-bottom: 0;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100dvh - env(safe-area-inset-top) - 96px);
  overflow-y: auto;
  overscroll-behavior: contain;
  pointer-events: auto;
}

.m3-notification-region--expanded .m3-notification-slot {
  align-self: stretch;
  transform: none;
}

.m3-notification-actions {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.m3-notification-pill {
  width: auto;
  min-height: 32px;
  margin: 0;
  padding: 0 16px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  box-shadow: var(--md-sys-elevation-level2);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
}

@media (prefers-reduced-motion: reduce) {
  .m3-notification-slot {
    transition: none;
  }
}
</style>
