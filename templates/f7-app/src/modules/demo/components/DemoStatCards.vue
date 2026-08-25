<template>
  <div class="grid grid-cols-2 gap-3 px-4">
    <F7Card v-for="tile in tiles" :key="tile.labelKey" class="m-0! rounded-2xl!" outline>
      <F7CardContent class="py-3!">
        <div class="flex items-center gap-2">
          <F7Icon :f7="tile.icon" :color="tile.color" size="20" />
          <span class="text-xs uppercase tracking-wide opacity-60">{{ t(tile.labelKey) }}</span>
        </div>
        <div class="mt-1 text-2xl font-semibold tabular-nums">{{ tile.value }}</div>
      </F7CardContent>
    </F7Card>
  </div>
</template>

<script setup lang="ts">
import type { DashboardStats } from "@/domains/sales/sales.repository";

const props = defineProps<{ stats: DashboardStats }>();
const { t } = useI18n();

/** Cents formatted once here rather than in four places in the template. */
const money = computed(() =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    props.stats.revenueCents / 100,
  ),
);

const tiles = computed(() => [
  {
    labelKey: "demo.tiles.customers",
    icon: "person_2_fill",
    color: "blue",
    value: String(props.stats.customers),
  },
  {
    labelKey: "demo.tiles.products",
    icon: "cube_box_fill",
    color: "purple",
    value: String(props.stats.products),
  },
  {
    labelKey: "demo.tiles.orders",
    icon: "doc_text_fill",
    color: "teal",
    value: String(props.stats.orders),
  },
  {
    labelKey: "demo.tiles.revenue",
    icon: "money_dollar_circle_fill",
    color: "green",
    value: money.value,
  },
]);
</script>
