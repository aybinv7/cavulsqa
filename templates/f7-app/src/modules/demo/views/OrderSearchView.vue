<template>
  <F7Page>
    <!--
      The shape from the Framework7 searchbar docs: an expandable searchbar inside the navbar, opened
      by a `searchbar-enable` link that points at it. Two earlier attempts got this wrong - a bare
      `expandable` bar with nothing to enable it renders nothing, and moving it to a subnavbar puts
      it below the title instead of taking the navbar over.
    -->
    <F7Navbar :title="t('demo.searchTitle')" back-link>
      <F7NavRight>
        <F7Link
          class="searchbar-enable"
          data-searchbar=".searchbar-orders"
          icon-ios="f7:search"
          icon-md="material:search"
        />
      </F7NavRight>
      <F7Searchbar
        class="searchbar-orders"
        expandable
        :placeholder="t('demo.searchPlaceholder')"
        :custom-search="true"
        :clear-button="true"
        @input="onInput"
        @searchbar:clear="onClear"
        @searchbar:disable="onClear"
      />
    </F7Navbar>

    <F7BlockTitle>
      {{ term ? t("demo.matches", { count: results.length }) : t("demo.allOrders") }}
    </F7BlockTitle>

    <F7List v-if="results.length" media-list strong inset dividers class="rounded-2xl!">
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

    <F7Block v-else strong inset class="rounded-2xl!">
      <p class="m-0 text-sm opacity-60">
        {{ term ? t("demo.noMatches") : t("demo.empty") }}
      </p>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import { useHiddenTabbar } from "@/shared/composables/useTabbarVisibility";
import { searchOrders, type OrderRow } from "@/domains/sales/sales.repository";
import { getDatabase } from "@/shared/database/database";
import { useReactiveQuery } from "@/shared/database/queries";

const { t } = useI18n();

// A pushed page owns the whole screen; the tab bar belongs to the tab roots.
useHiddenTabbar();

const term = ref("");

/**
 * The list is populated before anything is typed - an empty search screen gives no sense of what is
 * searchable. An empty term returns the most recent orders, which is what the query already does.
 */
const query = useReactiveQuery(() => searchOrders(getDatabase().db, term.value), {
  tables: ["sales_order", "order_line", "customer"],
  queryKey: ["demo:search", term],
  debounce: 200,
});

const results = computed<OrderRow[]>(() => query.data.value ?? []);

function onInput(event: Event) {
  term.value = (event.target as HTMLInputElement).value;
}

function onClear() {
  term.value = "";
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
</script>
