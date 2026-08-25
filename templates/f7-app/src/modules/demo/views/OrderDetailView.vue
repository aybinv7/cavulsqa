<template>
  <F7Page>
    <F7Navbar
      :title="order?.reference ?? t('demo.order')"
      :subtitle="order?.customerName"
      back-link
    >
      <F7NavRight>
        <F7Link v-if="order" icon-f7="trash" @click="confirmDelete" />
      </F7NavRight>
    </F7Navbar>

    <template v-if="order">
      <F7Block strong inset class="rounded-2xl! mt-3!">
        <div class="flex items-start justify-between">
          <div>
            <F7Chip :text="order.status" :color="statusColor" />
            <div class="mt-1.5 text-[13px] opacity-60">{{ order.city }}</div>
            <div v-if="order.tags.length" class="mt-2 flex flex-wrap gap-1.5">
              <F7Chip v-for="tag in order.tags" :key="tag" :text="tag" outline />
            </div>
          </div>
          <div class="text-right">
            <div class="text-[11px] uppercase tracking-wide opacity-55">{{ t("demo.total") }}</div>
            <div class="text-2xl font-semibold tabular-nums leading-tight">
              {{ money(order.totalCents) }}
            </div>
          </div>
        </div>
      </F7Block>

      <F7BlockTitle>{{ t("demo.lineItems") }}</F7BlockTitle>
      <!--
        media-list, not a plain list: Framework7 only renders `subtitle` in a media list, so the
        quantity and unit price were being dropped silently.
      -->
      <F7List media-list strong inset dividers class="rounded-2xl!">
        <F7ListItem
          v-for="line in order.lines"
          :key="line.id"
          :title="line.productName"
          :after="money(line.lineTotalCents)"
        >
          <template #subtitle>
            <span class="text-[13px] tabular-nums opacity-60">
              {{ line.quantity }} × {{ money(line.unitPriceCents) }}
            </span>
          </template>
        </F7ListItem>
      </F7List>
    </template>

    <F7Block v-else strong inset class="rounded-2xl! mt-3!">
      <p class="m-0 text-sm opacity-70">{{ t("demo.orderGone") }}</p>
    </F7Block>

    <!--
      A bottom toolbar rather than a hand-built bar: Framework7 spaces its links evenly and keeps
      them clear of the safe area, which the previous stacked segmented control did neither of.
      Delete moved to the navbar - it does not belong next to three statuses you pick between.
    -->
    <F7Toolbar v-if="order" bottom>
      <F7Link
        v-for="option in statuses"
        :key="option"
        :class="{ 'text-color-primary font-semibold': order.status === option }"
        @click="apply(option)"
      >
        {{ t(`demo.status${option.charAt(0).toUpperCase()}${option.slice(1)}`) }}
      </F7Link>
    </F7Toolbar>
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
import { useHiddenTabbar } from "@/shared/composables/useTabbarVisibility";
import { getDatabase, rdb } from "@/shared/database/database";
import { uniqueQueryKey, useReactiveQuery } from "@/shared/database/queries";

const { t } = useI18n();

// A pushed page owns the whole screen; the tab bar belongs to the tab roots.
useHiddenTabbar();

const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();

const orderId = Number(props.f7route.params.id ?? 0);
const statuses = ["draft", "confirmed", "delivered"] as const;

/**
 * Reads five tables, so any write in that set refreshes this page - including the status changes
 * made from the toolbar below, which is why nothing here calls refetch by hand.
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

async function apply(status: (typeof statuses)[number]) {
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
