<template>
  <AppPage :title="order?.reference ?? t('demo.order')" :subtitle="order?.customerName" back>
    <template v-if="order" #actions>
      <M3IconButton :label="t('demo.delete')" @click="confirmDelete">
        <i-ms-delete-outline-rounded />
      </M3IconButton>
    </template>

    <template v-if="order">
      <section class="mx-4 mt-2 flex items-center gap-4 rounded-xl bg-surface-container-low p-5">
        <M3ShapeMorph :shape="look.shape" class="size-16 transition-colors" :class="look.fill">
          <component :is="look.icon" class="size-7" :class="look.ink" />
        </M3ShapeMorph>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="type-label-large text-on-surface-variant"
            >{{ t(look.labelKey) }} · {{ order.city }}</span
          >
          <span class="type-headline-medium-emphasized font-rounded tabular-nums">{{
            formatMoney(order.totalCents)
          }}</span>
        </div>
      </section>

      <div v-if="order.tags.length" class="flex flex-wrap gap-2 px-4 pt-3">
        <M3Chip v-for="tag in order.tags" :key="tag" :label="tag" />
      </div>

      <SectionHeader :title="t('demo.lineItems')" />
      <M3List variant="segmented" inset>
        <M3ListItem
          v-for="line in order.lines"
          :key="line.id"
          :headline="line.productName"
          :supporting="`${line.quantity} × ${formatMoney(line.unitPriceCents)}`"
          :trailing-text="formatMoney(line.lineTotalCents)"
        />
      </M3List>
      <div class="h-16" aria-hidden="true" />
    </template>

    <EmptyState v-else shape="ghostish" :headline="t('demo.order')" :text="t('demo.orderGone')" />

    <template v-if="order" #fixed>
      <M3DockedToolbar class="app-detail-toolbar" :label="t('demo.status')">
        <M3ButtonGroup variant="connected" size="s" :label="t('demo.status')">
          <M3Button
            v-for="status in ORDER_STATUSES"
            :key="status"
            variant="tonal"
            toggle
            :selected="order.status === status"
            @update:selected="apply(status)"
          >
            {{ t(STATUS_LOOK[status].labelKey) }}
          </M3Button>
        </M3ButtonGroup>
      </M3DockedToolbar>
    </template>
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import {
  deleteOrder,
  loadOrderDetail,
  setOrderStatus,
  type OrderDetail,
} from "@/domains/sales/sales.repository";
import {
  ORDER_STATUSES,
  STATUS_LOOK,
  formatMoney,
  statusLook,
  type OrderStatus,
} from "@/modules/demo/composables/useOrderStatus";
import { getDatabase, rdb } from "@/shared/database/database";
import { useReactiveQuery } from "@/shared/database/queries";

const { t } = useI18n();
const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();
const dialog = useDialog();
const snackbar = useSnackbar();

const orderId = Number(props.f7route.params.id ?? 0);

/**
 * Reads five tables, so any write in that set refreshes this page - including the status changes
 * made from the toolbar below, which is why nothing here calls refetch by hand.
 */
const query = useReactiveQuery(() => loadOrderDetail(getDatabase().db, orderId), {
  tables: ["sales_order", "order_line", "customer", "product", "customer_tag"],
  queryKey: ["demo:order", orderId],
});

const order = computed<OrderDetail | null>(() => query.data.value ?? null);
const look = computed(() => statusLook(order.value?.status ?? "draft"));

async function apply(status: OrderStatus) {
  if (!order.value || order.value.status === status) return;
  try {
    await setOrderStatus(rdb, orderId, status);
  } catch (error) {
    console.error("[demo] status change failed", error);
    void snackbar.show({ message: t("demo.actionFailed"), duration: "long" });
  }
}

async function confirmDelete() {
  const confirmed = await dialog.confirm({
    headline: t("demo.delete"),
    text: t("demo.deleteConfirm"),
    confirmLabel: t("demo.delete"),
    dismissLabel: t("demo.cancel"),
    destructive: true,
  });
  if (!confirmed || !order.value) return;
  const reference = order.value.reference;
  try {
    await deleteOrder(rdb, orderId);
    props.f7router.back();
    void snackbar.show(t("demo.deleted", { reference }));
  } catch (error) {
    console.error("[demo] delete failed", error);
    void snackbar.show({ message: t("demo.actionFailed"), duration: "long" });
  }
}
</script>

<style scoped>
.app-detail-toolbar {
  position: absolute;
  inset: auto 0 0;
  z-index: 10;
}
</style>
