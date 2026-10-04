<template>
  <div class="grid grid-cols-2 gap-2 px-4">
    <div
      v-for="tile in tiles"
      :key="tile.labelKey"
      class="flex flex-col gap-2 rounded-lg p-4"
      :class="tile.surface"
    >
      <div class="flex items-center gap-2">
        <M3Shape :shape="tile.shape" class="size-8" :class="tile.badge">
          <component :is="tile.icon" class="size-4" />
        </M3Shape>
        <span class="type-label-large opacity-80">{{ t(tile.labelKey) }}</span>
      </div>
      <span class="type-headline-small-emphasized tabular-nums">{{ tile.value }}</span>
      <span v-if="tile.hint" class="type-body-small opacity-70">{{ tile.hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DashboardStats } from "@/domains/sales/sales.repository";
import { STATUS_LOOK, formatMoney } from "@/modules/demo/composables/useOrderStatus";
import PaymentsIcon from "~icons/material-symbols/monitoring-rounded";

const props = defineProps<{ stats: DashboardStats }>();
const { t } = useI18n();

/**
 * Status counts rather than plain totals, because they are what moves when you use the screen:
 * confirm one order and three of these four change at once, without anything telling them to.
 */
const tiles = computed(() => [
  {
    icon: STATUS_LOOK.draft.icon,
    shape: STATUS_LOOK.draft.shape,
    labelKey: "demo.tiles.draft",
    surface: "bg-surface-container-low text-on-surface",
    badge: STATUS_LOOK.draft.classes,
    value: String(props.stats.draft),
    hint: t("demo.tiles.ofOrders", { count: props.stats.orders }, props.stats.orders),
  },
  {
    icon: STATUS_LOOK.confirmed.icon,
    shape: STATUS_LOOK.confirmed.shape,
    labelKey: "demo.tiles.confirmed",
    surface: "bg-surface-container-low text-on-surface",
    badge: STATUS_LOOK.confirmed.classes,
    value: String(props.stats.confirmed),
    hint: "",
  },
  {
    icon: STATUS_LOOK.delivered.icon,
    shape: STATUS_LOOK.delivered.shape,
    labelKey: "demo.tiles.delivered",
    surface: "bg-surface-container-low text-on-surface",
    badge: STATUS_LOOK.delivered.classes,
    value: String(props.stats.delivered),
    hint: "",
  },
  {
    labelKey: "demo.tiles.committed",
    icon: PaymentsIcon,
    shape: "sunny" as const,
    surface: "bg-primary-container text-on-primary-container",
    badge: "bg-primary text-on-primary",
    value: formatMoney(props.stats.committedCents),
    hint: t("demo.tiles.ofTotal", { total: formatMoney(props.stats.revenueCents) }),
  },
]);
</script>
