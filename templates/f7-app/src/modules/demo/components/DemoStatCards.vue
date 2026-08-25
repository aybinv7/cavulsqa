<template>
  <div class="grid grid-cols-2 gap-2 px-3">
    <div
      v-for="tile in tiles"
      :key="tile.labelKey"
      class="rounded-2xl px-3 py-2.5"
      :style="{ background: 'var(--f7-list-bg-color, rgb(128 128 128 / 10%))' }"
    >
      <div class="flex items-center gap-1.5">
        <F7Icon :f7="tile.icon" :color="tile.color" size="16" />
        <span class="text-[11px] uppercase tracking-wide opacity-55">{{ t(tile.labelKey) }}</span>
      </div>
      <div class="mt-0.5 text-xl font-semibold tabular-nums leading-tight">{{ tile.value }}</div>
      <div v-if="tile.hint" class="text-[11px] opacity-45">{{ tile.hint }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DashboardStats } from "@/domains/sales/sales.repository";

const props = defineProps<{ stats: DashboardStats }>();
const { t } = useI18n();

const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const money = (cents: number) => formatter.format(cents / 100);

/**
 * Status counts rather than plain totals, because they are what actually moves when you use the
 * screen: confirm one order and three of these four change at once, without anything telling them
 * to. That is the whole point being demonstrated.
 */
const tiles = computed(() => [
  {
    labelKey: "demo.tiles.draft",
    icon: "doc_plaintext",
    color: "gray",
    value: String(props.stats.draft),
    hint: t("demo.tiles.ofOrders", { count: props.stats.orders }),
  },
  {
    labelKey: "demo.tiles.confirmed",
    icon: "shippingbox_fill",
    color: "orange",
    value: String(props.stats.confirmed),
    hint: "",
  },
  {
    labelKey: "demo.tiles.delivered",
    icon: "checkmark_seal_fill",
    color: "green",
    value: String(props.stats.delivered),
    hint: "",
  },
  {
    labelKey: "demo.tiles.committed",
    icon: "money_dollar_circle_fill",
    color: "teal",
    value: money(props.stats.committedCents),
    hint: t("demo.tiles.ofTotal", { total: money(props.stats.revenueCents) }),
  },
]);
</script>
