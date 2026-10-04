<template>
  <GalleryBlock :title="t('gallery.tables.orders')" :note="t('gallery.tables.ordersNote')" stack>
    <div class="flex flex-wrap items-center gap-2">
      <M3Chip
        kind="filter"
        :label="t('gallery.tables.dense')"
        :selected="dense"
        @update:selected="dense = $event"
      />
      <M3Chip
        v-for="count in ORDER_COUNTS"
        :key="count"
        kind="filter"
        :label="t('gallery.tables.rowCount', { count: count.toLocaleString(locale) })"
        :selected="size === count"
        @update:selected="size = count"
      />
      <span class="type-body-medium ms-auto text-on-surface-variant">{{
        t("gallery.tables.selected", { count: selected.length }, selected.length)
      }}</span>
    </div>
    <M3DataTable
      v-model:sort="sort"
      v-model:selected="selected"
      v-model:group="layout.group"
      v-model:pinned="layout.pinned"
      v-model:hidden="layout.hidden"
      class="-mx-2"
      :rows="orders"
      :columns="columns"
      :row-key="orderKey"
      :label="t('gallery.tables.orders')"
      :locale="locale"
      selectable
      sticky-first-column
      max-height="420px"
      :dense="dense"
      :select-all-label="t('gallery.tables.selectAll')"
      :select-row-label="selectRowLabel"
      :select-group-label="selectGroupLabel"
      :group-count-label="groupCount"
      :menu-labels="menuLabels"
      @row-click="openOrder"
    >
      <template #cell="{ row, column, text }">
        <span
          v-if="column.key === 'status'"
          :class="['gallery-status', `gallery-status--${row.status}`]"
          >{{ text }}</span
        >
        <template v-else>{{ text }}</template>
      </template>
      <template #footer>
        <tr>
          <td :colspan="span" class="text-end tabular-nums">
            {{ t("gallery.tables.total") }} · {{ money(total) }}
          </td>
        </tr>
      </template>
    </M3DataTable>
  </GalleryBlock>
</template>

<script setup lang="ts">
import type { DataColumn, DataSort } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import { ORDER_COUNTS, makeOrders, type Order } from "@/modules/gallery/composables/demoOrders";

const { t, locale } = useI18n();
const snackbar = useSnackbar();
const sort = ref<DataSort | null>({ key: "date", direction: "descending" });
const selected = ref<(string | number)[]>([]);
const dense = ref(false);
const size = ref<(typeof ORDER_COUNTS)[number]>(ORDER_COUNTS[0]);
const orders = shallowRef<Order[]>(makeOrders(size.value));
watch(size, (count) => {
  selected.value = [];
  orders.value = makeOrders(count);
});
const layout = useLocalStorage<{ group: string | null; pinned: string[]; hidden: string[] }>(
  "gallery.orders.layout",
  { group: null, pinned: [], hidden: [] },
);

const money = (cents: number) =>
  new Intl.NumberFormat(locale.value, { style: "currency", currency: "DZD" }).format(cents / 100);

const columns = computed<DataColumn<Order>[]>(() => [
  { key: "ref", label: t("gallery.tables.ref"), sortable: true },
  { key: "customer", label: t("gallery.tables.customer"), sortable: true },
  { key: "wilaya", label: t("gallery.inputs.wilaya"), sortable: true },
  {
    key: "date",
    label: t("gallery.tables.date"),
    sortable: true,
    format: (value) =>
      typeof value === "string" ? new Date(value).toLocaleDateString(locale.value) : "",
  },
  {
    key: "status",
    label: t("gallery.tables.status"),
    sortable: true,
    format: (value) => t(`gallery.inputs.statuses.${String(value)}`),
  },
  {
    key: "totalCents",
    label: t("gallery.tables.totalColumn"),
    numeric: true,
    sortable: true,
    summary: "sum",
    format: (value) => (typeof value === "number" ? money(value) : ""),
    formatSummary: money,
  },
]);

const span = computed(() => columns.value.length - layout.value.hidden.length + 1);

const menuLabels = computed(() => ({
  sortAscending: t("gallery.tables.menu.sortAscending"),
  sortDescending: t("gallery.tables.menu.sortDescending"),
  clearSort: t("gallery.tables.menu.clearSort"),
  groupBy: t("gallery.tables.menu.groupBy"),
  ungroup: t("gallery.tables.menu.ungroup"),
  pin: t("gallery.tables.menu.pin"),
  unpin: t("gallery.tables.menu.unpin"),
  hide: t("gallery.tables.menu.hide"),
  columns: t("gallery.tables.menu.columns"),
}));

function groupCount(count: number) {
  return t("gallery.tables.groupCount", { count }, count);
}

function selectGroupLabel(label: string) {
  return t("gallery.tables.selectGroup", { label });
}

const total = computed(() => {
  const chosen = new Set(selected.value);
  let sum = 0;
  for (const order of orders.value) {
    if (chosen.size === 0 || chosen.has(order.ref)) sum += order.totalCents;
  }
  return sum;
});

function openOrder(order: Order) {
  void snackbar.show(t("gallery.tables.opened", { ref: order.ref }));
}

function orderKey(order: Order) {
  return order.ref;
}

function selectRowLabel(order: Order) {
  return t("gallery.tables.selectRow", { ref: order.ref });
}
</script>

<style scoped>
.gallery-status {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.gallery-status--draft {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.gallery-status--confirmed {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.gallery-status--delivered {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}
</style>
