<template>
  <AppPage :title="t('gallery.tabs.title')" back variant="small">
    <template #bottom>
      <M3Tabs v-model="tab" :pager="pager" :label="t('gallery.tabs.title')">
        <M3Tab v-for="item in TABS" :key="item" :value="item" :label="t(`gallery.tabs.${item}`)" />
      </M3Tabs>
    </template>

    <M3TabPanels v-model="tab" :pager="pager" class="gallery-tabs__panels">
      <M3TabPanel value="orders" :label="t('gallery.tabs.orders')">
        <p class="type-body-medium m-0 px-6 py-3 text-on-surface-variant">
          {{ t("gallery.tabs.ordersNote") }}
        </p>
        <M3List variant="segmented" inset>
          <M3ListItem
            v-for="row in 18"
            :key="row"
            :headline="t('gallery.tabs.order', { n: 1000 + row })"
            :supporting="t('gallery.tabs.orderLines', { count: (row % 5) + 1 }, (row % 5) + 1)"
          >
            <template #leading><i-ms-receipt-long-outline-rounded /></template>
            <template #swipe-end>
              <M3SwipeAction :label="t('gallery.tabs.archive')" tone="secondary">
                <i-ms-archive-outline-rounded />
              </M3SwipeAction>
            </template>
          </M3ListItem>
        </M3List>
      </M3TabPanel>

      <M3TabPanel value="invoices" :label="t('gallery.tabs.invoices')">
        <M3List variant="segmented" inset class="py-3">
          <M3ListItem
            v-for="row in 24"
            :key="row"
            :headline="t('gallery.tabs.invoice', { n: 2000 + row })"
            :trailing-text="t('gallery.tabs.amount', { value: (row * 3150).toLocaleString() })"
          >
            <template #leading><i-ms-request-quote-outline-rounded /></template>
          </M3ListItem>
        </M3List>
      </M3TabPanel>

      <M3TabPanel value="payments" :label="t('gallery.tabs.payments')">
        <p class="type-body-medium m-0 px-6 py-3 text-on-surface-variant">
          {{ t("gallery.tabs.paymentsNote") }}
        </p>
        <M3Carousel
          :items="METHODS"
          :item-key="methodKey"
          :label="t('gallery.tabs.payments')"
          :height="160"
        >
          <template #default="{ item }">
            <div
              class="type-title-medium-emphasized grid size-full place-items-center bg-secondary-container text-on-secondary-container"
            >
              {{ t(`gallery.tabs.methods.${item}`) }}
            </div>
          </template>
        </M3Carousel>
      </M3TabPanel>

      <M3TabPanel value="returns" :label="t('gallery.tabs.returns')">
        <EmptyState
          shape="ghostish"
          :headline="t('gallery.tabs.noReturns')"
          :text="t('gallery.tabs.noReturnsText')"
        />
      </M3TabPanel>
    </M3TabPanels>
  </AppPage>
</template>

<script setup lang="ts">
import { createTabPager } from "@cavulsqa/m3e-vue";

const TABS = ["orders", "invoices", "payments", "returns"] as const;
const METHODS = ["cash", "cheque", "transfer", "credit"] as const;

const { t } = useI18n();
const tab = ref<string>("orders");
const pager = createTabPager();

function methodKey(method: (typeof METHODS)[number]) {
  return method;
}
</script>

<style scoped>
.gallery-tabs__panels {
  height: calc(100dvh - env(safe-area-inset-top) - 112px);
}
</style>
