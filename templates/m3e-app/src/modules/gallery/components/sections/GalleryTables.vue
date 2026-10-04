<template>
  <GalleryBlock :title="t('gallery.tables.orders')" :note="t('gallery.tables.ordersNote')" stack>
    <div class="flex flex-wrap items-center gap-2">
      <M3Chip
        kind="filter"
        :label="t('gallery.tables.dense')"
        :selected="dense"
        @update:selected="dense = $event"
      />
      <span class="type-body-medium ms-auto text-on-surface-variant">{{
        t("gallery.tables.selected", { count: selected.length }, selected.length)
      }}</span>
    </div>
    <M3DataTable
      v-model:sort="sort"
      v-model:selected="selected"
      class="-mx-2"
      :rows="ORDERS"
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
          <td />
          <td :colspan="4">{{ t("gallery.tables.total") }}</td>
          <td class="text-end tabular-nums">{{ money(total) }}</td>
        </tr>
      </template>
    </M3DataTable>
  </GalleryBlock>
</template>

<script setup lang="ts">
import type { DataColumn, DataSort } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import { WILAYAS } from "@/modules/gallery/composables/wilayas";

type Status = "draft" | "confirmed" | "delivered";

interface Order {
  ref: string;
  customer: string;
  wilaya: string;
  date: string;
  status: Status;
  totalCents: number;
}

const STATUSES: Status[] = ["draft", "confirmed", "delivered"];
const CUSTOMERS = ["Oran Market", "Blida Gros", "Épicerie Saïd", "Annaba Fresh", "Tlemcen Dist."];

const ORDERS: Order[] = Array.from({ length: 30 }, (_, index) => ({
  ref: `SO-${1001 + index}`,
  customer: CUSTOMERS[(index * 3) % CUSTOMERS.length]!,
  wilaya: WILAYAS[(index * 11) % WILAYAS.length]!,
  date: `2026-09-${String(1 + (index % 28)).padStart(2, "0")}`,
  status: STATUSES[(index * 7) % STATUSES.length]!,
  totalCents: ((index * 7919) % 90000) * 100 + 150000,
}));

const { t, locale } = useI18n();
const snackbar = useSnackbar();
const sort = ref<DataSort | null>({ key: "date", direction: "descending" });
const selected = ref<(string | number)[]>([]);
const dense = ref(false);

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
    format: (value) => (typeof value === "number" ? money(value) : ""),
  },
]);

const total = computed(() =>
  ORDERS.filter(
    (order) => selected.value.length === 0 || selected.value.includes(order.ref),
  ).reduce((sum, order) => sum + order.totalCents, 0),
);

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
