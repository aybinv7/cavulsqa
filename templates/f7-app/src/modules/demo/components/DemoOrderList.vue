<template>
  <!--
    `swiper-no-swiping` keeps the swipeable tabs out of this list: without it a horizontal drag
    revealed the swipeout actions and moved the tab pane at the same time.
  -->
  <F7List strong inset dividers class="rounded-2xl! swiper-no-swiping">
    <!--
      Swipe is the fast path and the tap opens the full action sheet, so a status change costs one
      gesture instead of a trip through a menu.
    -->
    <F7ListItem
      v-for="order in orders"
      :key="order.id"
      swipeout
      link="#"
      @click="$emit('open', order)"
    >
      <template #media>
        <F7Icon :f7="statusIcon(order.status)" :color="statusColor(order.status)" size="22" />
      </template>

      <template #title>
        <span class="font-medium">{{ order.reference }}</span>
      </template>

      <template #after>
        <span class="text-[15px] font-semibold tabular-nums">{{ money(order.totalCents) }}</span>
      </template>

      <template #subtitle>
        <span class="text-[13px] opacity-60">
          {{ order.customerName }} · {{ t("demo.lines", { count: order.lines }) }}
        </span>
      </template>

      <F7SwipeoutActions right>
        <F7SwipeoutButton
          v-if="order.status !== 'delivered'"
          color="orange"
          close
          @click="$emit('advance', order.id)"
        >
          {{ order.status === "draft" ? t("demo.confirm") : t("demo.deliver") }}
        </F7SwipeoutButton>
        <F7SwipeoutButton color="red" close @click="$emit('remove', order.id)">
          {{ t("demo.delete") }}
        </F7SwipeoutButton>
      </F7SwipeoutActions>
    </F7ListItem>
  </F7List>
</template>

<script setup lang="ts">
import type { OrderRow } from "@/domains/sales/sales.repository";

defineProps<{ orders: OrderRow[] }>();
defineEmits<{ open: [order: OrderRow]; advance: [orderId: number]; remove: [orderId: number] }>();

const { t } = useI18n();

const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const money = (cents: number) => formatter.format(cents / 100);

const statusColor = (status: string) =>
  status === "delivered" ? "green" : status === "confirmed" ? "orange" : "gray";

const statusIcon = (status: string) =>
  status === "delivered"
    ? "checkmark_seal_fill"
    : status === "confirmed"
      ? "shippingbox_fill"
      : "doc_plaintext";
</script>
