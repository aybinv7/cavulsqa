<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import M3LoadingIndicator from "../progress/M3LoadingIndicator.vue";
import { computed, nextTick, shallowRef, useTemplateRef } from "vue";
import {
  checkState,
  toggleCheck,
  visibleRows,
  type TreeNode,
  type TreeRow,
} from "../../utils/tree.js";

/**
 * Framework7's treeview: nested items that open and close - product categories, a chart of
 * accounts, folders. In `select` mode a row is chosen (`v-model:selected`); in `check` mode every
 * row has a tri-state check (`v-model:checked` holds leaf ids, and a branch is checked, mixed or
 * clear from its leaves) - permissions, filters. The chevron opens a branch; a `lazy` node's
 * children come from `load` the first time it opens.
 *
 * It is one ARIA tree: Up and Down move, Right opens a branch or steps into it, Left closes it or
 * steps out to the parent, Home and End jump, Space or Enter chooses. The visible rows render as
 * one flat list, so a deep tree is no deeper in the DOM.
 */
const props = withDefaults(
  defineProps<{
    items: readonly TreeNode[];
    label: string;
    mode?: "select" | "check";
    load?: (node: TreeNode) => Promise<readonly TreeNode[]>;
    loadingLabel?: string;
  }>(),
  { mode: "select", loadingLabel: "Loading" },
);

const selected = defineModel<string | null>("selected", { default: null });
const checked = defineModel<string[]>("checked", { default: () => [] });
const expanded = defineModel<string[]>("expanded", { default: () => [] });
const emit = defineEmits<{ activate: [node: TreeNode] }>();

const root = useTemplateRef<HTMLElement>("root");
const loaded = shallowRef(new Map<string, readonly TreeNode[]>());
const loading = shallowRef(new Set<string>());
const focusedId = shallowRef<string | null>(null);

const expandedSet = computed(() => new Set(expanded.value));
const checkedSet = computed(() => new Set(checked.value));
const rows = computed(() => visibleRows(props.items, expandedSet.value, loaded.value));
const tabStop = computed(
  () =>
    rows.value.find((row) => row.node.id === focusedId.value)?.node.id ??
    rows.value.find((row) => row.node.id === selected.value)?.node.id ??
    rows.value[0]?.node.id,
);

const isOpen = (row: TreeRow) => expandedSet.value.has(row.node.id);
const stateOf = (row: TreeRow) => checkState(row.node, checkedSet.value, loaded.value);
const ariaChecked = (row: TreeRow) => {
  const state = stateOf(row);
  return state === "mixed" ? "mixed" : state === "checked";
};

async function open(row: TreeRow) {
  if (!row.branch || isOpen(row)) return;
  expanded.value = [...expanded.value, row.node.id];
  const node = row.node;
  if (!node.lazy || node.children || loaded.value.has(node.id) || !props.load) return;
  loading.value = new Set([...loading.value, node.id]);
  try {
    const children = await props.load(node);
    const next = new Map(loaded.value);
    next.set(node.id, children);
    loaded.value = next;
  } finally {
    const rest = new Set(loading.value);
    rest.delete(node.id);
    loading.value = rest;
  }
}

function close(row: TreeRow) {
  expanded.value = expanded.value.filter((id) => id !== row.node.id);
}

function toggle(row: TreeRow) {
  if (isOpen(row)) close(row);
  else void open(row);
}

function choose(row: TreeRow) {
  if (row.node.disabled) return;
  focusedId.value = row.node.id;
  if (props.mode === "check")
    checked.value = [...toggleCheck(row.node, checkedSet.value, loaded.value)];
  else selected.value = row.node.id;
  emit("activate", row.node);
}

async function focusRow(id: string | undefined) {
  if (!id) return;
  focusedId.value = id;
  await nextTick();
  root.value?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(id)}"]`)?.focus();
}

function onKeydown(event: KeyboardEvent, row: TreeRow, index: number) {
  const list = rows.value;
  const rtl = root.value ? getComputedStyle(root.value).direction === "rtl" : false;
  const inward = rtl ? "ArrowLeft" : "ArrowRight";
  const outward = rtl ? "ArrowRight" : "ArrowLeft";
  const key = event.key;
  let handled = true;
  if (key === "ArrowDown") void focusRow(list[index + 1]?.node.id);
  else if (key === "ArrowUp") void focusRow(list[index - 1]?.node.id);
  else if (key === "Home") void focusRow(list[0]?.node.id);
  else if (key === "End") void focusRow(list.at(-1)?.node.id);
  else if (key === inward) {
    if (row.branch && !isOpen(row)) void open(row);
    else if (row.branch)
      void focusRow(
        list[index + 1]?.parentId === row.node.id ? list[index + 1]?.node.id : undefined,
      );
  } else if (key === outward) {
    if (row.branch && isOpen(row)) close(row);
    else void focusRow(row.parentId ?? undefined);
  } else if (key === "Enter" || key === " ") choose(row);
  else handled = false;
  if (handled) event.preventDefault();
}
</script>

<template>
  <div
    ref="root"
    class="m3-tree"
    role="tree"
    :aria-label="props.label"
    :aria-multiselectable="props.mode === 'check' || undefined"
  >
    <template v-for="(row, index) in rows" :key="row.node.id">
      <div
        class="m3-tree__row m3-state"
        :class="{
          'm3-tree__row--selected': props.mode === 'select' && selected === row.node.id,
          'm3-tree__row--disabled': row.node.disabled,
        }"
        role="treeitem"
        :data-tree-id="row.node.id"
        :aria-level="row.level"
        :aria-setsize="row.siblings"
        :aria-posinset="row.position"
        :aria-expanded="row.branch ? isOpen(row) : undefined"
        :aria-selected="props.mode === 'select' ? selected === row.node.id : undefined"
        :aria-checked="props.mode === 'check' ? ariaChecked(row) : undefined"
        :aria-disabled="row.node.disabled || undefined"
        :tabindex="row.node.id === tabStop ? 0 : -1"
        :style="{ '--m3-tree-level': row.level - 1 }"
        @click="choose(row)"
        @keydown="onKeydown($event, row, index)"
        @focus="focusedId = row.node.id"
      >
        <span
          class="m3-tree__toggle"
          :class="{ 'm3-tree__toggle--open': isOpen(row), 'm3-tree__toggle--leaf': !row.branch }"
          aria-hidden="true"
          @click.stop="row.branch && toggle(row)"
        >
          <M3Glyph v-if="row.branch" name="expandMore" />
        </span>
        <span
          v-if="props.mode === 'check'"
          class="m3-tree__check"
          :class="`m3-tree__check--${stateOf(row)}`"
          aria-hidden="true"
        >
          <M3Glyph v-if="stateOf(row) === 'checked'" name="check" />
          <span v-else-if="stateOf(row) === 'mixed'" class="m3-tree__dash" />
        </span>
        <span v-if="$slots.icon" class="m3-tree__icon" aria-hidden="true">
          <slot name="icon" :node="row.node" :expanded="isOpen(row)" />
        </span>
        <span class="m3-tree__text">
          <span class="m3-tree__label">{{ row.node.label }}</span>
          <span v-if="row.node.supporting" class="m3-tree__supporting">{{
            row.node.supporting
          }}</span>
        </span>
        <span v-if="$slots.trailing" class="m3-tree__trailing"
          ><slot name="trailing" :node="row.node"
        /></span>
      </div>
      <div
        v-if="loading.has(row.node.id)"
        class="m3-tree__loading"
        :style="{ '--m3-tree-level': row.level }"
        role="none"
      >
        <M3LoadingIndicator :size="24" :label="props.loadingLabel" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.m3-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m3-tree__row {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  min-height: 48px;
  padding: 4px 16px 4px calc(4px + var(--m3-tree-level) * 24px);
  border-radius: 24px;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition: background-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-tree__row:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
}

.m3-tree__row--selected {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-tree__row--disabled {
  opacity: 0.38;
  cursor: default;
}

.m3-tree__toggle {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  color: var(--md-sys-color-on-surface-variant);
  rotate: -90deg;
  transition: rotate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

:global([dir="rtl"] .m3-tree__toggle) {
  rotate: 90deg;
}

.m3-tree__toggle--open,
:global([dir="rtl"] .m3-tree__toggle--open) {
  rotate: 0deg;
}

.m3-tree__toggle--leaf {
  cursor: inherit;
}

.m3-tree__toggle :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-tree__check {
  display: grid;
  flex: none;
  place-items: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  margin: 0 11px 0 3px;
  border: 2px solid var(--md-sys-color-on-surface-variant);
  border-radius: 2px;
  color: var(--md-sys-color-on-primary);
}

.m3-tree__check--checked,
.m3-tree__check--mixed {
  border-color: var(--md-sys-color-primary);
  background: var(--md-sys-color-primary);
}

.m3-tree__check :deep(svg) {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.m3-tree__dash {
  width: 8px;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
}

.m3-tree__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-inline-end: 12px;
  color: var(--md-sys-color-on-surface-variant);
}

.m3-tree__row--selected .m3-tree__icon,
.m3-tree__row--selected .m3-tree__supporting,
.m3-tree__row--selected .m3-tree__toggle {
  color: inherit;
}

.m3-tree__icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.m3-tree__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.m3-tree__label {
  overflow: hidden;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-tree__supporting {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-tree__trailing {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-tree__loading {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding-inline-start: calc(48px + var(--m3-tree-level) * 24px);
}
</style>
