<template>
  <F7Page>
    <F7Navbar
      :title="order?.reference ?? t('demo.order')"
      :subtitle="order?.customerName"
      back-link
    />

    <template v-if="order">
      <F7Block strong inset class="rounded-2xl! mt-3!">
        <div class="flex items-center justify-between">
          <div>
            <F7Chip :text="order.status" :color="statusColor" />
            <div class="mt-1 text-[13px] opacity-60">{{ order.city }}</div>
          </div>
          <div class="text-right">
            <div class="text-[11px] uppercase tracking-wide opacity-55">{{ t("demo.total") }}</div>
            <div class="text-2xl font-semibold tabular-nums leading-tight">
              {{ money(order.totalCents) }}
            </div>
          </div>
        </div>

        <div v-if="order.tags.length" class="mt-3 flex flex-wrap gap-1.5">
          <F7Chip v-for="tag in order.tags" :key="tag" :text="tag" outline />
        </div>
      </F7Block>

      <F7BlockTitle>{{ t("demo.lineItems") }}</F7BlockTitle>
      <F7List strong inset dividers class="rounded-2xl!">
        <F7ListItem
          v-for="line in order.lines"
          :key="line.id"
          :title="line.productName"
          :after="money(line.lineTotalCents)"
        >
          <template #subtitle>
            <span class="text-[13px] opacity-60">
              {{ line.quantity }} × {{ money(line.unitPriceCents) }}
            </span>
          </template>
        </F7ListItem>
      </F7List>

      <!-- Room to scroll past the fixed action bar. -->
      <div class="h-24" />
    </template>

    <F7Block v-else strong inset class="rounded-2xl! mt-3!">
      <p class="m-0 text-sm opacity-70">{{ t("demo.orderGone") }}</p>
    </F7Block>

    <!--
      Actions live in a fixed bar at the bottom rather than an action sheet: on a detail screen they
      are the point of the page, so they should be reachable without opening anything.
    -->
    <div v-if="order" slot="fixed" class="order-actions">
      <F7Segmented raised>
        <F7Button :active="order.status === 'draft'" @click="apply('draft')">
          {{ t("demo.statusDraft") }}
        </F7Button>
        <F7Button :active="order.status === 'confirmed'" @click="apply('confirmed')">
          {{ t("demo.statusConfirmed") }}
        </F7Button>
        <F7Button :active="order.status === 'delivered'" @click="apply('delivered')">
          {{ t("demo.statusDelivered") }}
        </F7Button>
      </F7Segmented>

      <F7Button class="mt-2" color="red" @click="confirmDelete">
        {{ t("demo.delete") }}
      </F7Button>
    </div>
  </F7Page>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import {
  deleteOrder,
  loadOrderDetail,
  setOrderStatus,
  type OrderDetail,
} from "@/domains/sales/sales.repository";
import { getDatabase, rdb } from "@/shared/database/database";
import { uniqueQueryKey, useReactiveQuery } from "@/shared/database/queries";

const { t } = useI18n();
const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();

const orderId = Number(props.f7route.params.id ?? 0);

/**
 * Reads five tables, so any write in that set refreshes this page - including the status changes
 * made from the bar below, which is why nothing here calls refetch by hand.
 */
const query = useReactiveQuery(() => loadOrderDetail(getDatabase().db, orderId), {
  tables: ["sales_order", "order_line", "customer", "product", "customer_tag"],
  queryKey: uniqueQueryKey(`demo:order-${String(orderId)}`),
});

const order = computed<OrderDetail | null>(() => query.data.value ?? null);

const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const money = (cents: number) => formatter.format(cents / 100);

const statusColor = computed(() =>
  order.value?.status === "delivered"
    ? "green"
    : order.value?.status === "confirmed"
      ? "orange"
      : "gray",
);

async function apply(status: "draft" | "confirmed" | "delivered") {
  if (!order.value || order.value.status === status) return;
  await setOrderStatus(rdb, orderId, status);
}

function confirmDelete() {
  f7.dialog.confirm(t("demo.deleteConfirm"), t("demo.delete"), () => {
    void deleteOrder(rdb, orderId).then(() => {
      props.f7router.back();
    });
  });
}
</script>

<style scoped>
.order-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px 16px calc(12px + var(--f7-safe-area-bottom, 0px));
  background: var(--f7-page-bg-color);
  box-shadow: 0 -8px 24px rgb(0 0 0 / 12%);
}
</style>
