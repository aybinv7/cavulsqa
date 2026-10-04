<script setup lang="ts" generic="T">
import DataTableColumnMenu from "./DataTableColumnMenu.vue";
import M3Checkbox from "../selection/M3Checkbox.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import {
  cellText,
  cellValue,
  groupRows,
  nextSort,
  orderColumns,
  sortRows,
  summarize,
  type ColumnMenuLabels,
  type DataColumn,
  type DataSort,
} from "../../utils/dataTable.js";

/**
 * Framework7's data table in Material colours, for the tables an ERP lives on: columns described
 * as data, numbers right-aligned in tabular figures, and with `selectable` a check column whose
 * header selects every row. Rows sort here by default; `:sort-locally="false"` sorts on the server
 * from the model.
 *
 * A header opens the column's menu: sort ascending or descending, group the rows by it (each group
 * collapsible, with a count and the columns' `summary` - sum, average or count), pin it to the
 * start (pinned columns stay while the table scrolls sideways), hide it, and bring hidden ones
 * back. Each of these is a model - `v-model:sort`, `group`, `pinned`, `hidden` - so a screen can
 * keep a person's layout. `:column-menu="false"` makes a header sort on tap instead.
 *
 * It is a real table. Wide tables scroll sideways; with `max-height` the table scrolls inside
 * itself and the header stays in view. `#cell` renders a custom cell (`{ row, column, value, text }`),
 * `#empty` an empty table, `#footer` a row of totals or a pager.
 */
const props = withDefaults(
  defineProps<{
    rows: readonly T[];
    columns: readonly DataColumn<T>[];
    rowKey: (row: T) => string | number;
    label: string;
    selectable?: boolean;
    sortLocally?: boolean;
    maxHeight?: string;
    stickyFirstColumn?: boolean;
    dense?: boolean;
    locale?: string;
    columnMenu?: boolean;
    selectAllLabel?: string;
    selectRowLabel?: (row: T) => string;
    selectGroupLabel?: (label: string) => string;
    groupCountLabel?: (count: number) => string;
    emptyText?: string;
    emptyGroupLabel?: string;
    menuLabels?: Partial<ColumnMenuLabels>;
  }>(),
  {
    selectable: false,
    sortLocally: true,
    stickyFirstColumn: false,
    dense: false,
    columnMenu: true,
    selectAllLabel: "Select all rows",
    selectRowLabel: () => "Select row",
    selectGroupLabel: (label: string) => `Select ${label}`,
    groupCountLabel: (count: number) => (count === 1 ? "1 row" : `${count} rows`),
    emptyText: "Nothing to show",
    emptyGroupLabel: "-",
    menuLabels: () => ({}),
  },
);

const sort = defineModel<DataSort | null>("sort", { default: null });
const selected = defineModel<(string | number)[]>("selected", { default: () => [] });
const hidden = defineModel<string[]>("hidden", { default: () => [] });
const pinned = defineModel<string[]>("pinned", { default: () => [] });
const group = defineModel<string | null>("group", { default: null });
const emit = defineEmits<{ "row-click": [row: T] }>();

defineSlots<{
  cell?: (scope: { row: T; column: DataColumn<T>; value: unknown; text: string }) => unknown;
  empty?: () => unknown;
  footer?: () => unknown;
}>();

const LABELS: ColumnMenuLabels = {
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  clearSort: "Clear sort",
  groupBy: "Group by this column",
  ungroup: "Ungroup",
  pin: "Pin to start",
  unpin: "Unpin",
  hide: "Hide column",
  columns: "Columns",
};

const labels = computed(() => ({ ...LABELS, ...props.menuLabels }));
const pinnedKeys = computed(() => {
  if (pinned.value.length) return pinned.value;
  if (!props.stickyFirstColumn) return [];
  const first = props.columns.find((column) => !hidden.value.includes(column.key));
  return first ? [first.key] : [];
});
const visible = computed(() => orderColumns(props.columns, hidden.value, pinnedKeys.value));
const span = computed(() => visible.value.length + (props.selectable ? 1 : 0));

const sorted = computed(() =>
  props.sortLocally ? sortRows(props.rows, props.columns, sort.value, props.locale) : props.rows,
);
const groupColumn = computed(() =>
  group.value ? (props.columns.find((column) => column.key === group.value) ?? null) : null,
);
const groups = computed(() =>
  groupColumn.value
    ? groupRows(sorted.value, groupColumn.value, props.locale, props.emptyGroupLabel)
    : null,
);
const collapsed = shallowRef<ReadonlySet<string>>(new Set());

type Line =
  | { kind: "group"; key: string; label: string; rows: T[] }
  | { kind: "row"; key: string | number; row: T };

const lines = computed<Line[]>(() => {
  if (!groups.value)
    return sorted.value.map((row) => ({ kind: "row", key: props.rowKey(row), row }));
  return groups.value.flatMap((entry) => [
    { kind: "group" as const, key: `group:${entry.key}`, label: entry.label, rows: entry.rows },
    ...(collapsed.value.has(entry.key)
      ? []
      : entry.rows.map((row) => ({ kind: "row" as const, key: props.rowKey(row), row }))),
  ]);
});

const selectedSet = computed(() => new Set(selected.value));
const allSelected = computed(
  () =>
    props.rows.length > 0 && props.rows.every((row) => selectedSet.value.has(props.rowKey(row))),
);
const someSelected = computed(
  () => !allSelected.value && props.rows.some((row) => selectedSet.value.has(props.rowKey(row))),
);

const headers = new Map<string, HTMLElement>();
let checkHeader: HTMLElement | null = null;
const offsets = shallowRef<Readonly<Record<string, number>>>({});

function setHeader(key: string, element: unknown) {
  if (element instanceof HTMLElement) headers.set(key, element);
  else headers.delete(key);
}

function setCheckHeader(element: unknown) {
  checkHeader = element instanceof HTMLElement ? element : null;
}

function measure() {
  let left = props.selectable ? (checkHeader?.offsetWidth ?? 56) : 0;
  const next: Record<string, number> = {};
  for (const column of visible.value) {
    if (!pinnedKeys.value.includes(column.key)) break;
    next[column.key] = left;
    left += headers.get(column.key)?.offsetWidth ?? 0;
  }
  offsets.value = next;
}

const lastPinned = computed(() => {
  const keys = visible.value.filter((column) => pinnedKeys.value.includes(column.key));
  return keys.at(-1)?.key ?? null;
});

function pinStyle(column: DataColumn<T>) {
  const offset = offsets.value[column.key];
  return offset === undefined ? undefined : { insetInlineStart: `${offset}px` };
}

function pinClass(column: DataColumn<T>) {
  if (!pinnedKeys.value.includes(column.key)) return undefined;
  return {
    "m3-data-table__pinned": true,
    "m3-data-table__pinned--edge": column.key === lastPinned.value,
  };
}

const menuOpen = shallowRef(false);
const menuColumn = shallowRef<DataColumn<T> | null>(null);
const menuAnchor = shallowRef<HTMLElement | null>(null);

function onHeader(column: DataColumn<T>, event: MouseEvent) {
  if (!props.columnMenu) {
    if (column.sortable) sort.value = nextSort(sort.value, column.key);
    return;
  }
  menuColumn.value = column;
  menuAnchor.value = event.currentTarget as HTMLElement;
  menuOpen.value = true;
}

function setPinned(key: string, on: boolean) {
  const current = pinnedKeys.value.filter((entry) => entry !== key);
  pinned.value = on ? [...current, key] : current;
}

function setHidden(key: string, on: boolean) {
  const current = hidden.value.filter((entry) => entry !== key);
  hidden.value = on ? [...current, key] : current;
  if (on && pinned.value.includes(key))
    pinned.value = pinned.value.filter((entry) => entry !== key);
  if (on && group.value === key) group.value = null;
}

function ariaSort(column: DataColumn<T>) {
  if (!column.sortable) return undefined;
  return sort.value?.key === column.key ? sort.value.direction : "none";
}

function toggleAll() {
  selected.value = allSelected.value ? [] : props.rows.map((row) => props.rowKey(row));
}

function toggleRow(row: T, on: boolean) {
  const key = props.rowKey(row);
  selected.value = on
    ? [...selected.value, key]
    : selected.value.filter((candidate) => candidate !== key);
}

function groupState(rows: readonly T[]) {
  const count = rows.filter((row) => selectedSet.value.has(props.rowKey(row))).length;
  return { all: count > 0 && count === rows.length, some: count > 0 && count < rows.length };
}

function toggleGroupSelection(rows: readonly T[]) {
  const keys = rows.map((row) => props.rowKey(row));
  const all = groupState(rows).all;
  const rest = selected.value.filter((key) => !keys.includes(key));
  selected.value = all ? rest : [...rest, ...keys];
}

function toggleGroup(key: string) {
  const id = key.slice("group:".length);
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}

function summaryText(column: DataColumn<T>, rows: readonly T[]): string {
  const value = summarize(rows, column);
  if (value === null) return "";
  if (column.formatSummary) return column.formatSummary(value);
  return new Intl.NumberFormat(props.locale, { maximumFractionDigits: 2 }).format(value);
}

watch(group, () => (collapsed.value = new Set()));
watch([visible, pinnedKeys, () => props.rows.length], () => void nextTick(measure));
onMounted(() => {
  void nextTick(measure);
  window.addEventListener("resize", measure);
});
onBeforeUnmount(() => window.removeEventListener("resize", measure));
</script>

<template>
  <div
    class="m3-data-table"
    :class="{
      'm3-data-table--dense': props.dense,
      'm3-data-table--bounded': props.maxHeight,
      'm3-data-table--pinning': pinnedKeys.length > 0,
      'm3-data-table--selectable': props.selectable,
    }"
    :style="{ maxHeight: props.maxHeight }"
  >
    <table class="m3-data-table__table" :aria-label="props.label">
      <thead>
        <tr>
          <th
            v-if="props.selectable"
            :ref="setCheckHeader"
            class="m3-data-table__check"
            scope="col"
          >
            <M3Checkbox
              :model-value="allSelected"
              :indeterminate="someSelected"
              :label="props.selectAllLabel"
              :disabled="props.rows.length === 0"
              @update:model-value="toggleAll"
            />
          </th>
          <th
            v-for="column in visible"
            :key="column.key"
            :ref="(element) => setHeader(column.key, element)"
            scope="col"
            :class="[{ 'm3-data-table__cell--numeric': column.numeric }, pinClass(column)]"
            :style="[{ width: column.width, minWidth: column.width }, pinStyle(column)]"
            :aria-sort="ariaSort(column)"
          >
            <button
              v-if="props.columnMenu || column.sortable"
              type="button"
              class="m3-data-table__sort m3-focus-ring"
              :class="{
                'm3-data-table__sort--active': sort?.key === column.key,
                'm3-data-table__sort--descending':
                  sort?.key === column.key && sort.direction === 'descending',
              }"
              :aria-haspopup="props.columnMenu ? 'menu' : undefined"
              @click="onHeader(column, $event)"
            >
              <M3Glyph
                v-if="pinnedKeys.includes(column.key) && pinned.length"
                name="pin"
                :size="16"
                class="m3-data-table__mark"
              />
              <M3Glyph
                v-if="group === column.key"
                name="groupRows"
                :size="16"
                class="m3-data-table__mark"
              />
              <span>{{ column.label }}</span>
              <svg class="m3-data-table__arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11 20V7.825l-5.6 5.6L4 12l8-8l8 8l-1.4 1.425l-5.6-5.6V20z" />
              </svg>
            </button>
            <span v-else>{{ column.label }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="line in lines" :key="line.key">
          <tr
            v-if="line.kind === 'group'"
            class="m3-data-table__group"
            :class="{ 'm3-data-table__group--collapsed': collapsed.has(line.key.slice(6)) }"
            @click="toggleGroup(line.key)"
          >
            <td v-if="props.selectable" class="m3-data-table__check" @click.stop>
              <M3Checkbox
                :model-value="groupState(line.rows).all"
                :indeterminate="groupState(line.rows).some"
                :label="props.selectGroupLabel(line.label)"
                @update:model-value="toggleGroupSelection(line.rows)"
              />
            </td>
            <template v-for="(column, index) in visible" :key="column.key">
              <th
                v-if="index === 0"
                scope="row"
                :class="pinClass(column)"
                :style="pinStyle(column)"
              >
                <button
                  type="button"
                  class="m3-data-table__group-toggle m3-focus-ring"
                  :aria-expanded="!collapsed.has(line.key.slice(6))"
                >
                  <M3Glyph name="expandMore" :size="20" class="m3-data-table__chevron" />
                  <span>{{ line.label }}</span>
                  <span class="m3-data-table__count">{{
                    props.groupCountLabel(line.rows.length)
                  }}</span>
                </button>
              </th>
              <td
                v-else
                :class="[{ 'm3-data-table__cell--numeric': column.numeric }, pinClass(column)]"
                :style="pinStyle(column)"
              >
                {{ summaryText(column, line.rows) }}
              </td>
            </template>
          </tr>
          <tr
            v-else
            :class="{ 'm3-data-table__row--selected': selectedSet.has(line.key) }"
            :aria-selected="props.selectable ? selectedSet.has(line.key) : undefined"
            @click="emit('row-click', line.row)"
          >
            <td v-if="props.selectable" class="m3-data-table__check" @click.stop>
              <M3Checkbox
                :model-value="selectedSet.has(line.key)"
                :label="props.selectRowLabel(line.row)"
                @update:model-value="(on: boolean) => toggleRow(line.row, on)"
              />
            </td>
            <td
              v-for="column in visible"
              :key="column.key"
              :class="[{ 'm3-data-table__cell--numeric': column.numeric }, pinClass(column)]"
              :style="pinStyle(column)"
            >
              <slot
                name="cell"
                :row="line.row"
                :column="column"
                :value="cellValue(line.row, column)"
                :text="cellText(line.row, column, props.locale)"
                >{{ cellText(line.row, column, props.locale) }}</slot
              >
            </td>
          </tr>
        </template>
        <tr v-if="sorted.length === 0" class="m3-data-table__empty">
          <td :colspan="span">
            <slot name="empty">{{ props.emptyText }}</slot>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="$slots.footer">
        <slot name="footer" />
      </tfoot>
    </table>
    <DataTableColumnMenu
      v-if="props.columnMenu"
      v-model:open="menuOpen"
      :column="menuColumn"
      :anchor="menuAnchor"
      :columns="props.columns"
      :sort="sort"
      :group="group"
      :pinned="pinned"
      :hidden="hidden"
      :labels="labels"
      @sort="sort = $event"
      @group="group = $event"
      @pin="setPinned"
      @hide="setHidden"
    />
  </div>
</template>

<style scoped>
.m3-data-table {
  --m3-data-table-row: 52px;
  --m3-data-table-header: 56px;
  --m3-data-table-surface: var(--md-sys-color-surface-container-lowest);
  overflow: auto;
  overscroll-behavior-x: contain;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 16px;
  background: var(--m3-data-table-surface);
  color: var(--md-sys-color-on-surface);
}

.m3-data-table--dense {
  --m3-data-table-row: 40px;
  --m3-data-table-header: 44px;
}

.m3-data-table__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

th,
td {
  box-sizing: border-box;
  padding: 0 16px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  text-align: start;
  white-space: nowrap;
}

thead th {
  height: var(--m3-data-table-header);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
  letter-spacing: var(--md-sys-typescale-title-small-tracking);
}

td,
tbody th {
  height: var(--m3-data-table-row);
}

tbody tr:last-child :is(td, th) {
  border-bottom: 0;
}

.m3-data-table__cell--numeric {
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.m3-data-table--bounded thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--m3-data-table-surface);
}

.m3-data-table--pinning .m3-data-table__check {
  position: sticky;
  inset-inline-start: 0;
  z-index: 1;
  background: linear-gradient(var(--m3-data-table-row-tint), var(--m3-data-table-row-tint))
    var(--m3-data-table-surface);
}

.m3-data-table--pinning thead .m3-data-table__check {
  z-index: 3;
}

.m3-data-table__pinned {
  position: sticky;
  z-index: 1;
  background: linear-gradient(var(--m3-data-table-row-tint), var(--m3-data-table-row-tint))
    var(--m3-data-table-surface);
}

.m3-data-table thead th.m3-data-table__pinned {
  z-index: 3;
}

.m3-data-table__pinned--edge {
  box-shadow: inset -1px 0 0 var(--md-sys-color-outline-variant);
}

:global([dir="rtl"] .m3-data-table__pinned--edge) {
  box-shadow: inset 1px 0 0 var(--md-sys-color-outline-variant);
}

.m3-data-table__check {
  width: 56px;
  padding: 0 4px 0 12px;
}

tbody tr {
  --m3-data-table-row-tint: transparent;
  background: var(--m3-data-table-row-tint);
  transition: background-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

tbody tr:hover {
  --m3-data-table-row-tint: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent);
}

.m3-data-table__row--selected,
.m3-data-table__row--selected:hover {
  --m3-data-table-row-tint: color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent);
}

.m3-data-table__group {
  cursor: pointer;
}

.m3-data-table__group,
.m3-data-table__group:hover {
  --m3-data-table-row-tint: transparent;
  --m3-data-table-surface: var(--md-sys-color-surface-container-low);
}

.m3-data-table__group :is(td, th) {
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-data-table__group-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: auto;
  margin: 0 -8px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.m3-data-table__chevron {
  transition: rotate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-data-table__group--collapsed .m3-data-table__chevron {
  rotate: -90deg;
}

:global([dir="rtl"] .m3-data-table__group--collapsed .m3-data-table__chevron) {
  rotate: 90deg;
}

.m3-data-table__count {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-data-table__sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: auto;
  margin: 0 -4px;
  padding: 4px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.m3-data-table__cell--numeric .m3-data-table__sort {
  flex-direction: row-reverse;
}

.m3-data-table__mark {
  color: var(--md-sys-color-primary);
}

.m3-data-table__arrow {
  width: 18px;
  height: 18px;
  fill: currentColor;
  opacity: 0;
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    rotate var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-data-table__sort:hover .m3-data-table__arrow {
  opacity: 0.38;
}

.m3-data-table__sort--active {
  color: var(--md-sys-color-on-surface);
}

.m3-data-table__sort--active .m3-data-table__arrow,
.m3-data-table__sort--active:hover .m3-data-table__arrow {
  opacity: 1;
}

.m3-data-table__sort--descending .m3-data-table__arrow {
  rotate: 180deg;
}

.m3-data-table__empty td {
  height: 120px;
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
}

tfoot :deep(td),
tfoot :deep(th) {
  height: var(--m3-data-table-header);
  border-top: 1px solid var(--md-sys-color-outline-variant);
  border-bottom: 0;
  font-weight: 600;
}
</style>
