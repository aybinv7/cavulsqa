<template>
  <F7Page>
    <!--
      A search page rather than a searchbar bolted onto the dashboard: it opens focused, shows only
      matches, and carries none of the surrounding furniture.
    -->
    <F7Navbar no-shadow>
      <F7NavLeft>
        <F7Link back icon-f7="chevron_left" />
      </F7NavLeft>
      <F7Searchbar
        ref="searchbar"
        :placeholder="t('demo.searchPlaceholder')"
        :value="term"
        :clear-button="true"
        :disable-button="false"
        :custom-search="true"
        inline
        expandable
        @input="onInput"
        @searchbar:clear="term = ''"
      />
    </F7Navbar>

    <F7List v-if="results.length" media-list strong inset dividers class="rounded-2xl! mt-2!">
      <F7ListItem
        v-for="order in results"
        :key="order.id"
        :title="order.reference"
        :after="money(order.totalCents)"
        :subtitle="`${order.customerName} · ${order.city}`"
      >
        <template #media>
          <F7Icon :f7="statusIcon(order.status)" :color="statusColor(order.status)" size="22" />
        </template>
      </F7ListItem>
    </F7List>

    <F7Block v-else class="text-center">
      <p class="m-0 text-sm opacity-50">
        {{ term ? t("demo.noMatches") : t("demo.searchHint") }}
      </p>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import { searchOrders, type OrderRow } from "@/domains/sales/sales.repository";
import { getDatabase } from "@/shared/database/database";
import { uniqueQueryKey, useReactiveQuery } from "@/shared/database/queries";

const { t } = useI18n();
const term = ref("");

const query = useReactiveQuery(() => searchOrders(getDatabase().db, term.value), {
  tables: ["sales_order", "order_line", "customer"],
  queryKey: uniqueQueryKey("demo:search"),
  debounce: 200,
});

const results = computed<OrderRow[]>(() => (term.value ? (query.data.value ?? []) : []));

function onInput(event: Event) {
  term.value = (event.target as HTMLInputElement).value;
  void query.refetch();
}

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

// Focus on arrival, so the keyboard is already up when the page settles.
onMounted(() => {
  requestAnimationFrame(() => {
    document.querySelector<HTMLInputElement>(".page-current .searchbar input")?.focus();
  });
});
</script>
