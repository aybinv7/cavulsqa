<script setup lang="ts">
import { provide, shallowRef, useTemplateRef } from "vue";
import { useHaptics } from "../../composables/services.js";
import { useListSortable } from "../../composables/useListSortable.js";
import { LIST_ACCORDION } from "./accordionContext.js";
import { LIST_SORTABLE } from "./sortContext.js";

/**
 * An Expressive list. `segmented` gives every item its own surface, 2dp apart, with small inner
 * corners and large outer ones; a pressed or selected item rounds off completely. `standard` is a
 * plain run of items on the parent's surface.
 *
 * `accordion` keeps one expandable item open at a time, as Framework7's accordion list does. An
 * expanded item in a segmented list steps out of the run as its own rounded card, and its
 * neighbours round off the corners that face it.
 *
 * `sortable` is Framework7's sortable list: every item gets a drag handle, and an item can also be
 * long-pressed and dragged. The lifted item takes the tertiary container on level 4, the others
 * step aside, and the page scrolls near its edges. `@sort="(from, to) => ..."` reorders the data -
 * `moveItem` from this package does it - and the move is announced to assistive technology. Arrow
 * keys on a focused handle move an item one place.
 *
 * @see https://m3.material.io/components/lists/specs
 */
const props = withDefaults(
  defineProps<{
    variant?: "standard" | "segmented";
    inset?: boolean;
    label?: string;
    accordion?: boolean;
    sortable?: boolean;
    reorderLabel?: string;
    movedText?: (label: string, position: number, count: number) => string;
  }>(),
  {
    variant: "segmented",
    inset: false,
    accordion: false,
    sortable: false,
    reorderLabel: "Reorder",
    movedText: (label: string, position: number, count: number) =>
      `${label}, position ${position} of ${count}`,
  },
);

defineOptions({ inheritAttrs: false });

const emit = defineEmits<{ sort: [from: number, to: number] }>();
const list = useTemplateRef<HTMLElement>("list");
const haptics = useHaptics();
const announcement = shallowRef("");

useListSortable({
  list,
  enabled: () => props.sortable,
  onSort: (from, to) => emit("sort", from, to),
  onMoved(item, to, count) {
    const label = item.querySelector(".m3-list-item__headline")?.textContent?.trim() ?? "";
    announcement.value = props.movedText(label, to + 1, count);
  },
  onPickUp: () => haptics.confirm(),
  onCross: () => haptics.tick(),
});

provide(LIST_SORTABLE, { enabled: () => props.sortable, label: () => props.reorderLabel });

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
    ref="list"
    v-bind="$attrs"
    class="m3-list"
    :class="[`m3-list--${props.variant}`, { 'm3-list--inset': props.inset }]"
    :aria-label="props.label"
  >
    <slot />
  </ul>
  <Teleport v-if="props.sortable" to="body">
    <span class="m3-visually-hidden" aria-live="assertive">{{ announcement }}</span>
  </Teleport>
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

.m3-list--sorting > :deep(.m3-list-item:not(.m3-list-item--dragging)) {
  transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-list--settled > :deep(.m3-list-item),
.m3-list--settled > :deep(.m3-list-item.m3-list-item--dropping) {
  transition: none;
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
