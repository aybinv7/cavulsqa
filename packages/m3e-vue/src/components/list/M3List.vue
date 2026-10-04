<script setup lang="ts">
import { provide } from "vue";
import { LIST_ACCORDION } from "./accordionContext.js";

/**
 * An Expressive list. `segmented` gives every item its own surface, 2dp apart, with small inner
 * corners and large outer ones; a pressed or selected item rounds off completely. `standard` is a
 * plain run of items on the parent's surface.
 *
 * `accordion` keeps one expandable item open at a time, as Framework7's accordion list does. An
 * expanded item in a segmented list steps out of the run as its own rounded card, and its
 * neighbours round off the corners that face it.
 *
 * @see https://m3.material.io/components/lists/specs
 */
const props = withDefaults(
  defineProps<{
    variant?: "standard" | "segmented";
    inset?: boolean;
    label?: string;
    accordion?: boolean;
  }>(),
  {
    variant: "segmented",
    inset: false,
    accordion: false,
  },
);

let open: (() => void) | null = null;
provide(LIST_ACCORDION, {
  opened(collapse) {
    if (!props.accordion) return;
    if (open && open !== collapse) open();
    open = collapse;
  },
  closed(collapse) {
    if (open === collapse) open = null;
  },
});
</script>

<template>
  <ul
    class="m3-list"
    :class="[`m3-list--${props.variant}`, { 'm3-list--inset': props.inset }]"
    :aria-label="props.label"
  >
    <slot />
  </ul>
</template>

<style scoped>
.m3-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.m3-list--inset {
  margin-inline: 16px;
}

.m3-list--segmented {
  gap: 2px;
}

.m3-list--segmented > :deep(.m3-list-item) {
  --m3-list-item-container: var(
    --m3-segmented-container,
    var(--md-sys-color-surface-container-low)
  );
  --m3-list-item-start: 4px;
  --m3-list-item-end: 4px;
}

.m3-list--segmented > :deep(.m3-list-item:first-child) {
  --m3-list-item-start: 16px;
}

.m3-list--segmented > :deep(.m3-list-item:last-child) {
  --m3-list-item-end: 16px;
}

.m3-list--segmented > :deep(.m3-list-item:has(+ .m3-list-item.m3-list-item--expanded)) {
  --m3-list-item-end: 16px;
}

.m3-list--segmented > :deep(.m3-list-item.m3-list-item--expanded + .m3-list-item) {
  --m3-list-item-start: 16px;
}

.m3-list--segmented > :deep(.m3-list-item.m3-list-item--expanded) {
  --m3-list-item-start: 16px;
  --m3-list-item-end: 16px;
  margin-block: 6px;
}

.m3-list--segmented > :deep(.m3-list-item.m3-list-item--expanded:first-child) {
  margin-top: 0;
}

.m3-list--segmented > :deep(.m3-list-item.m3-list-item--expanded:last-child) {
  margin-bottom: 0;
}
</style>
