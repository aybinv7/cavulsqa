<script setup lang="ts" generic="T">
import M3Checkbox from "../selection/M3Checkbox.vue";
import { computed } from "vue";
import {
  cellText,
  cellValue,
  nextSort,
  sortRows,
  type DataColumn,
  type DataSort,
} from "../../utils/dataTable.js";

/**
 * Framework7's data table in Material colours, for the tables an ERP lives on: columns described
 * as data, numbers right-aligned in tabular figures, headers that sort (ascending, descending,
 * off - `v-model:sort`), and with `selectable` a check column whose header selects every row.
 * Rows sort here by default; pass `:sort-locally="false"` to sort on the server from the model.
 *
 * It is a real table. Wide tables scroll sideways; with `max-height` the table scrolls inside
 * itself and the header and, with `sticky-first-column`, the first column stay in view. `#cell`
 * renders a custom cell (`{ row, column, value, text }`), `#empty` an empty table, `#footer` a
 * row of totals or a pager.
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
    selectAllLabel?: string;
    selectRowLabel?: (row: T) => string;
    emptyText?: string;
  }>(),
  {
    selectable: false,
    sortLocally: true,
    stickyFirstColumn: false,
    dense: false,
    selectAllLabel: "Select all rows",
    selectRowLabel: () => "Select row",
    emptyText: "Nothing to show",
  },
);

const sort = defineModel<DataSort | null>("sort", { default: null });
const selected = defineModel<(string | number)[]>("selected", { default: () => [] });
const emit = defineEmits<{ "row-click": [row: T] }>();

defineSlots<{
  cell?: (scope: { row: T; column: DataColumn<T>; value: unknown; text: string }) => unknown;
  empty?: () => unknown;
  footer?: () => unknown;
}>();

const shown = computed(() =>
  props.sortLocally ? sortRows(props.rows, props.columns, sort.value, props.locale) : props.rows,
);
const selectedSet = computed(() => new Set(selected.value));
const allSelected = computed(
  () =>
    props.rows.length > 0 && props.rows.every((row) => selectedSet.value.has(props.rowKey(row))),
);
const someSelected = computed(
  () => !allSelected.value && props.rows.some((row) => selectedSet.value.has(props.rowKey(row))),
);

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
</script>

<template>
  <div
    class="m3-data-table"
    :class="{
      'm3-data-table--dense': props.dense,
      'm3-data-table--bounded': props.maxHeight,
      'm3-data-table--sticky-first': props.stickyFirstColumn,
      'm3-data-table--selectable': props.selectable,
    }"
    :style="{ maxHeight: props.maxHeight }"
  >
    <table class="m3-data-table__table" :aria-label="props.label">
      <thead>
        <tr>
          <th v-if="props.selectable" class="m3-data-table__check" scope="col">
            <M3Checkbox
              :model-value="allSelected"
              :indeterminate="someSelected"
              :label="props.selectAllLabel"
              :disabled="props.rows.length === 0"
              @update:model-value="toggleAll"
            />
          </th>
          <th
            v-for="column in props.columns"
            :key="column.key"
            scope="col"
            :class="{ 'm3-data-table__cell--numeric': column.numeric }"
            :style="{ width: column.width, minWidth: column.width }"
            :aria-sort="ariaSort(column)"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="m3-data-table__sort m3-focus-ring"
              :class="{
                'm3-data-table__sort--active': sort?.key === column.key,
                'm3-data-table__sort--descending':
                  sort?.key === column.key && sort.direction === 'descending',
              }"
              @click="sort = nextSort(sort, column.key)"
            >
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
        <tr
          v-for="row in shown"
          :key="props.rowKey(row)"
          :class="{ 'm3-data-table__row--selected': selectedSet.has(props.rowKey(row)) }"
          :aria-selected="props.selectable ? selectedSet.has(props.rowKey(row)) : undefined"
          @click="emit('row-click', row)"
        >
          <td v-if="props.selectable" class="m3-data-table__check" @click.stop>
            <M3Checkbox
              :model-value="selectedSet.has(props.rowKey(row))"
              :label="props.selectRowLabel(row)"
              @update:model-value="(on: boolean) => toggleRow(row, on)"
            />
          </td>
          <td
            v-for="column in props.columns"
            :key="column.key"
            :class="{ 'm3-data-table__cell--numeric': column.numeric }"
          >
            <slot
              name="cell"
              :row="row"
              :column="column"
              :value="cellValue(row, column)"
              :text="cellText(row, column, props.locale)"
              >{{ cellText(row, column, props.locale) }}</slot
            >
          </td>
        </tr>
        <tr v-if="shown.length === 0" class="m3-data-table__empty">
          <td :colspan="props.columns.length + (props.selectable ? 1 : 0)">
            <slot name="empty">{{ props.emptyText }}</slot>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="$slots.footer">
        <slot name="footer" />
      </tfoot>
    </table>
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

.m3-data-table--selectable {
  --m3-data-table-pinned: 56px;
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

th {
  height: var(--m3-data-table-header);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
  letter-spacing: var(--md-sys-typescale-title-small-tracking);
}

td {
  height: var(--m3-data-table-row);
}

tbody tr:last-child td {
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

.m3-data-table--sticky-first .m3-data-table__check {
  position: sticky;
  inset-inline-start: 0;
  z-index: 1;
  background: var(--m3-data-table-surface);
}

.m3-data-table--sticky-first thead .m3-data-table__check {
  z-index: 3;
}

.m3-data-table--sticky-first :is(th, td):nth-child(1 of :not(.m3-data-table__check)) {
  position: sticky;
  inset-inline-start: var(--m3-data-table-pinned, 0px);
  z-index: 1;
  background: var(--m3-data-table-surface);
  box-shadow: inset -1px 0 0 var(--md-sys-color-outline-variant);
}

.m3-data-table--sticky-first thead :is(th):nth-child(1 of :not(.m3-data-table__check)) {
  z-index: 3;
}

.m3-data-table__check {
  width: 56px;
  padding: 0 4px 0 12px;
}

tbody tr {
  transition: background-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

tbody tr:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent);
}

.m3-data-table__row--selected,
.m3-data-table__row--selected:hover {
  background: color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent);
}

.m3-data-table__sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
