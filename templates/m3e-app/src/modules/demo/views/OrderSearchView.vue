<template>
  <AppPage :title="t('demo.searchTitle')" back>
    <div class="sticky top-[calc(64px+env(safe-area-inset-top))] z-[2] bg-surface px-4 pt-1 pb-3">
      <M3SearchBar
        v-model="term"
        :placeholder="t('demo.searchPlaceholder')"
        :clear-label="t('gallery.inputs.clear')"
        autofocus
      />
    </div>

    <SectionHeader
      :title="
        term ? t('demo.matches', { count: results.length }, results.length) : t('demo.allOrders')
      "
    />

    <M3List v-if="results.length" variant="segmented" inset>
      <M3ListItem
        v-for="order in results"
        :key="order.id"
        clickable
        :headline="order.reference"
        :supporting="`${order.customerName} · ${order.city}`"
        :trailing-text="formatMoney(order.totalCents)"
        @click="f7router.navigate(`/demo/order/${String(order.id)}/`)"
      >
        <template #leading>
          <M3Shape
            :shape="statusLook(order.status).shape"
            class="size-10"
            :class="statusLook(order.status).classes"
          >
            <component :is="statusLook(order.status).icon" class="size-5" />
          </M3Shape>
        </template>
      </M3ListItem>
    </M3List>

    <EmptyState
      v-else
      shape="sunny"
      :headline="term ? t('demo.noMatchesTitle') : t('demo.emptyTitle')"
      :text="term ? t('demo.noMatches') : t('demo.empty')"
    >
      <template #icon><i-ms-search-rounded class="size-10" /></template>
    </EmptyState>
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { searchOrders, type OrderRow } from "@/domains/sales/sales.repository";
import { formatMoney, statusLook } from "@/modules/demo/composables/useOrderStatus";
import { getDatabase } from "@/shared/database/database";
import { useReactiveQuery } from "@/shared/database/queries";

defineProps<{ f7router: Router.Router }>();
const { t } = useI18n();
const term = ref("");

/**
 * Populated before anything is typed - an empty search screen gives no sense of what is
 * searchable. The term is in the key, so typing re-runs the query through its own debounce.
 */
const query = useReactiveQuery(() => searchOrders(getDatabase().db, term.value), {
  tables: ["sales_order", "order_line", "customer"],
  queryKey: ["demo:search", term],
  debounce: 200,
});

const results = computed<OrderRow[]>(() => query.data.value ?? []);
</script>
