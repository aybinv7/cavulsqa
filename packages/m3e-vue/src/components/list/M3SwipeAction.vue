<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useListSwipeContext } from "./swipeContext.js";

/**
 * One action behind a swiped list row, drawn the way Compose's reveal-list tokens describe it: a
 * round icon button in `secondaryContainer`, or `primary` for the row's main action, `error` for a
 * destructive one. On a side that allows a full swipe, the outermost action stretches into a pill
 * as the swipe arms and is the one that fires. Tapping an action runs it and closes the row.
 *
 * Put it in `M3ListItem`'s `#swipe-start` or `#swipe-end`, the icon in the default slot, and keep
 * the same action reachable without a swipe - from the row's menu.
 */
const props = withDefaults(
  defineProps<{ label: string; tone?: "secondary" | "primary" | "tertiary" | "error" }>(),
  { tone: "secondary" },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
const swipe = useListSwipeContext();
const root = useTemplateRef<HTMLElement>("root");

function onClick(event: MouseEvent) {
  emit("click", event);
  swipe?.close();
}

onMounted(() => {
  if (root.value) swipe?.register(root.value, () => emit("click", new MouseEvent("click")));
});
onBeforeUnmount(() => {
  if (root.value) swipe?.unregister(root.value);
});
</script>

<template>
  <div ref="root" class="m3-swipe-action" :class="`m3-swipe-action--${props.tone}`">
    <button
      v-ripple
      type="button"
      class="m3-swipe-action__button m3-state m3-focus-ring"
      :aria-label="props.label"
      @click="onClick"
    >
      <span class="m3-swipe-action__icon" aria-hidden="true"><slot /></span>
    </button>
  </div>
</template>

<style scoped>
.m3-swipe-action {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  transition: flex-grow var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-swipe-action__button {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  transition: width var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-swipe-action__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 24px;
}

.m3-swipe-action__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-swipe-action--secondary .m3-swipe-action__button {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-swipe-action--primary .m3-swipe-action__button {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-swipe-action--tertiary .m3-swipe-action__button {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-swipe-action--error .m3-swipe-action__button {
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}
</style>
