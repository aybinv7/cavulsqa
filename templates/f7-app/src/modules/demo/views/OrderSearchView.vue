<template>
  <F7Page>
    <!--
      Framework7's documented shape for a search screen: the searchbar lives in a subnavbar with
      `:inner="false"`, which is what keeps it on screen instead of collapsing with the title. The
      previous version put it inside the navbar with `expandable`, so it rendered nothing.
    -->
    <F7Navbar :title="t('demo.searchTitle')" back-link>
      <F7Subnavbar :inner="false">
        <F7Searchbar
          :placeholder="t('demo.searchPlaceholder')"
          :clear-button="true"
          :disable-button="false"
          :custom-search="true"
          @input="onInput"
          @searchbar:clear="term = ''"
        />
      </F7Subnavbar>
    </F7Navbar>

    <F7List v-if="results.length" media-list strong inset dividers class="rounded-2xl! mt-2!">
      <F7ListItem
        v-for="order in results"
        :key="order.id"
        :title="order.reference"
        :after="money(order.totalCents)"
        :link="`/demo/order/${String(order.id)}/`"
      >
        <template #media>
          <F7Icon :f7="statusIcon(order.status)" :color="statusColor(order.status)" size="22" />
        </template>
        <template #subtitle>
          <span class="text-[13px] opacity-60">{{ order.customerName }} · {{ order.city }}</span>
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

// Focused on arrival, so the keyboard is already up once the page settles.
onMounted(() => {
  requestAnimationFrame(() => {
    document.querySelector<HTMLInputElement>(".page-current .searchbar input")?.focus();
  });
});
</script>
