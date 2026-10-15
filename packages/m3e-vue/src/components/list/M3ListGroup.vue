<script setup lang="ts">
import M3List from "./M3List.vue";
import { useId, useTemplateRef, watch } from "vue";
import { useAppBarOffset } from "../../composables/useAppBarOffset.js";
import { useReducedMotion } from "../../composables/useReducedMotion.js";

/**
 * One titled run of a list - Framework7's contacts-list group. The title sticks under the app bar
 * while its items scroll past, then the next group's title pushes it away. `indexKey` (the title by
 * default) is what `M3ListIndex` jumps to. Set `--m3-list-group-top` when something else is pinned
 * above, such as tabs.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    indexKey?: string;
    variant?: "standard" | "segmented";
    inset?: boolean;
  }>(),
  { variant: "segmented", inset: true },
);

const titleId = useId();
const title = useTemplateRef<HTMLElement>("title");
const offset = useAppBarOffset(title);
const reduced = useReducedMotion();

watch(
  offset,
  (px) => {
    const element = title.value;
    if (!element) return;
    element.toggleAttribute("data-away", px > 0);
    element.style.setProperty("--m3-app-bar-offset", `${px}px`);
  },
  { flush: "post" },
);
</script>

<template>
  <section
    class="m3-list-group"
    :data-index-key="props.indexKey ?? props.title"
    :aria-labelledby="titleId"
  >
    <h3
      :id="titleId"
      ref="title"
      class="m3-list-group__title"
      :class="{ 'm3-list-group__title--still': reduced }"
    >
      {{ props.title }}
    </h3>
    <M3List :variant="props.variant" :inset="props.inset"><slot /></M3List>
  </section>
</template>

<style scoped>
.m3-list-group {
  padding-bottom: 8px;
}

.m3-list-group__title {
  position: sticky;
  top: var(
    --m3-list-group-top,
    calc(env(safe-area-inset-top) + 64px - var(--m3-app-bar-offset, 0px))
  );
  z-index: 2;
  margin: 0;
  padding: 12px 28px 8px;
  background: var(--m3-list-group-surface, var(--md-sys-color-surface));
  color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
  letter-spacing: var(--md-sys-typescale-title-small-tracking);
  transition: top var(--md-sys-motion-duration-medium1)
    var(--md-sys-motion-easing-emphasized-decelerate);
}

.m3-list-group__title[data-away] {
  transition: top var(--md-sys-motion-duration-short4)
    var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-list-group__title--still,
.m3-list-group__title--still[data-away] {
  transition: none;
}
</style>
