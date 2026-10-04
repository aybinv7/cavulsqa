<script setup lang="ts" generic="T">
import { computed, onMounted, onScopeDispose, shallowRef, useTemplateRef, watch } from "vue";
import {
  assignSlots,
  leadingRange,
  prefixOffsets,
  type VirtualRange,
} from "../../composables/useVirtualRange.js";
import { useScrollContainer, type ScrollTarget } from "../../composables/useScrollContainer.js";
import { useElementSize } from "../../composables/useElementSize.js";

/**
 * A list that renders only the rows on screen, for catalogues in the thousands. It virtualises
 * against the page's own scroller rather than a scroll box of its own, so the top app bar still
 * collapses and pull-to-refresh still works. Rows have a known size - a number, or a function of
 * the row - which for M3 list items is 56, 72 or 88 plus the 2dp segment gap.
 *
 * The default slot renders one row: `#default="{ item, index }"`; put an `M3ListItem as="div"` in
 * it - the row wrapper already carries the list-item role.
 *
 * Rows are recycled: a row scrolling out hands its DOM to the row scrolling in, so a fling patches
 * text instead of mounting components, and the range runs ahead of the scroll in proportion to its
 * speed. Row components must therefore render from props alone; set `recycle` to false for rows
 * holding local state, which keys them by `itemKey` instead.
 */
const props = withDefaults(
  defineProps<{
    items: readonly T[];
    itemSize: number | ((item: T, index: number) => number);
    itemKey: (item: T, index: number) => string | number;
    variant?: "standard" | "segmented";
    inset?: boolean;
    overscan?: number;
    label?: string;
    scrollTarget?: ScrollTarget;
    recycle?: boolean;
  }>(),
  { variant: "segmented", inset: false, overscan: 4, recycle: true },
);

const root = useTemplateRef<HTMLElement>("root");
const scrollTop = shallowRef(0);
const viewport = shallowRef(0);
const listTop = shallowRef(0);
const lead = shallowRef(0);
const LEAD_FRAMES = 8;

const scroller = useScrollContainer(
  root,
  () => props.scrollTarget,
  (top, delta) => {
    scrollTop.value = top;
    const limit = viewport.value * 1.5;
    lead.value = Math.max(-limit, Math.min(limit, Math.round(delta * LEAD_FRAMES)));
  },
);
const { height: scrollerHeight } = useElementSize(scroller);

const offsets = computed(() => {
  const size = props.itemSize;
  const items = props.items;
  return prefixOffsets(
    items.length,
    typeof size === "number" ? () => size : (index) => size(items[index]!, index),
  );
});

const total = computed(() => offsets.value[offsets.value.length - 1] ?? 0);

const range = computed<VirtualRange>((previous) => {
  const next = leadingRange(
    offsets.value,
    scrollTop.value - listTop.value,
    viewport.value,
    props.overscan,
    lead.value,
  );
  return previous && previous.start === next.start && previous.end === next.end ? previous : next;
});

let slots = new Map<number, number>();

const rows = computed(() => {
  const { start, end } = range.value;
  if (props.recycle) slots = assignSlots(slots, start, end);
  const out: Array<{ item: T; index: number; key: string | number; top: number }> = [];
  for (let index = start; index < end; index++) {
    const item = props.items[index]!;
    out.push({
      item,
      index,
      key: props.recycle ? slots.get(index)! : props.itemKey(item, index),
      top: offsets.value[index]!,
    });
  }
  return out;
});

/** Where the list starts inside the scroller; content above it shifts when, say, a header loads. */
function measure() {
  const list = root.value;
  const container = scroller.value;
  if (!list || !container) return;
  const listRect = list.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  listTop.value = listRect.top - containerRect.top + container.scrollTop;
  viewport.value = container.clientHeight;
}

watch([scrollerHeight, () => props.items.length], measure, { flush: "post" });
onMounted(measure);

let observer: ResizeObserver | null = null;
watch(
  scroller,
  (container) => {
    observer?.disconnect();
    if (!container || typeof ResizeObserver === "undefined") return;
    observer = new ResizeObserver(measure);
    observer.observe(root.value?.parentElement ?? container);
  },
  { flush: "post" },
);
onScopeDispose(() => observer?.disconnect());

defineExpose({
  /** Scrolls the page so row `index` sits at the top of the visible area. */
  scrollToIndex(index: number, behavior: ScrollBehavior = "smooth") {
    const container = scroller.value;
    const offset = offsets.value[Math.max(0, Math.min(index, props.items.length - 1))] ?? 0;
    container?.scrollTo({ top: listTop.value + offset, behavior });
  },
});
</script>

<template>
  <div
    ref="root"
    class="m3-virtual-list"
    :class="[`m3-virtual-list--${props.variant}`, { 'm3-virtual-list--inset': props.inset }]"
    role="list"
    :aria-label="props.label"
    :aria-rowcount="props.items.length"
    :style="{ height: `${total}px` }"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      class="m3-virtual-list__row"
      :class="{
        'm3-virtual-list__row--first': row.index === 0,
        'm3-virtual-list__row--last': row.index === props.items.length - 1,
      }"
      role="listitem"
      :aria-rowindex="row.index + 1"
      :style="{ transform: `translateY(${row.top}px)` }"
    >
      <slot :item="row.item" :index="row.index" />
    </div>
  </div>
</template>

<style scoped>
.m3-virtual-list {
  position: relative;
  contain: layout paint style;
}

.m3-virtual-list--inset {
  margin-inline: 16px;
}

.m3-virtual-list__row {
  position: absolute;
  inset-inline: 0;
  top: 0;
  contain: layout paint;
}

.m3-virtual-list__row :deep(.m3-list-item) {
  list-style: none;
}

.m3-virtual-list--segmented .m3-virtual-list__row :deep(.m3-list-item) {
  --m3-list-item-container: var(
    --m3-segmented-container,
    var(--md-sys-color-surface-container-low)
  );
  --m3-list-item-start: 4px;
  --m3-list-item-end: 4px;
}

.m3-virtual-list--segmented .m3-virtual-list__row--first :deep(.m3-list-item) {
  --m3-list-item-start: 16px;
}

.m3-virtual-list--segmented .m3-virtual-list__row--last :deep(.m3-list-item) {
  --m3-list-item-end: 16px;
}
</style>
