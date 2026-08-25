<template>
  <F7List media-list strong inset dividers class="rounded-2xl!">
    <F7ListItem
      v-for="order in orders"
      :key="order.id"
      :title="order.reference"
      :subtitle="`${order.customerName} · ${order.city}`"
      link="#"
      @click="$emit('advance', order.id)"
    >
      <template #media>
        <F7Icon :f7="statusIcon(order.status)" :color="statusColor(order.status)" />
      </template>
      <template #after>
        <span class="font-semibold tabular-nums">{{ money(order.totalCents) }}</span>
      </template>
      <template #text>
        <F7Chip :text="order.status" :color="statusColor(order.status)" outline />
        <span class="ml-2 opacity-60">{{ t("demo.lines", { count: order.lines }) }}</span>
      </template>
    </F7ListItem>
  </F7List>
</template>

<script setup lang="ts">
import type { OrderRow } from "@/domains/sales/sales.repository";

defineProps<{ orders: OrderRow[] }>();
defineEmits<{ advance: [orderId: number] }>();

const { t } = useI18n();

const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const money = (cents: number) => formatter.format(cents / 100);

/** Tapping a row advances the status, so the colour is the feedback that the write landed. */
const statusColor = (status: string) =>
  status === "delivered" ? "green" : status === "confirmed" ? "orange" : "gray";

const statusIcon = (status: string) =>
  status === "delivered"
    ? "checkmark_seal_fill"
    : status === "confirmed"
      ? "shippingbox_fill"
      : "doc_plaintext";
</script>
