<template>
  <F7Page :page-content="false">
    <F7Navbar :title="t('demo.title')" :sliding="true">
      <F7NavRight>
        <F7Link icon-f7="magnifyingglass" href="/demo/search/" />
        <F7Link icon-f7="chart_bar_alt_fill" panel-open="right" />
      </F7NavRight>
    </F7Navbar>

    <!-- Real Framework7 tabs, so the panes swipe rather than switching on a v-if. -->
    <F7Toolbar tabbar top>
      <F7Link tab-link="#demo-tab-data" tab-link-active>{{ t("demo.data") }}</F7Link>
      <F7Link tab-link="#demo-tab-diagnostics">{{ t("demo.diagnostics") }}</F7Link>
    </F7Toolbar>

    <F7Tabs swipeable>
      <F7Tab id="demo-tab-data" class="page-content" tab-active>
        <DemoStatCards :stats="stats" class="mt-3" />

        <F7BlockTitle>
          {{ t("demo.orders") }}
          <span v-if="loading" class="ml-2 text-xs opacity-60">{{ t("demo.refetching") }}</span>
        </F7BlockTitle>

        <DemoOrderList
          v-if="orders.length"
          :orders="orders"
          @open="openActions"
          @advance="advance"
          @remove="remove"
        />
        <F7Block v-else strong inset class="rounded-2xl!">
          <p class="m-0 text-sm opacity-70">{{ t("demo.empty") }}</p>
        </F7Block>

        <F7Block class="text-center">
          <p class="m-0 text-xs opacity-45">{{ t("demo.swipeHint") }}</p>
        </F7Block>
      </F7Tab>

      <F7Tab id="demo-tab-diagnostics" class="page-content">
        <DemoBusLog :entries="busLog" />
        <DemoPipelineBenchmark
          :result="pipeline"
          :measuring="measuring"
          :reads-per-run="readsPerRun"
          :is-native="isNative"
          :platform="platform"
          @measure="measurePipelining"
        />
      </F7Tab>
    </F7Tabs>

    <!--
      Buttons open upward: the app's tab bar sits at the bottom of the shell, so a downward or
      morphed menu disappears behind it.
    -->
    <F7Fab slot="fixed" position="right-bottom" class="demo-fab">
      <F7Icon f7="plus" />
      <F7Icon f7="xmark" />
      <F7FabButtons position="top">
        <F7FabButton fab-close :label="t('demo.newOrder')" @click="createOpen = true">
          <F7Icon f7="doc_badge_plus" size="20" />
        </F7FabButton>
        <F7FabButton fab-close :label="t('demo.seed')" @click="run(seed)">
          <F7Icon f7="wand_stars" size="20" />
        </F7FabButton>
        <F7FabButton fab-close :label="t('demo.clear')" @click="run(clear)">
          <F7Icon f7="trash" size="20" />
        </F7FabButton>
      </F7FabButtons>
    </F7Fab>

    <DemoCreateOrderSheet :opened="createOpen" @close="createOpen = false" @save="onSaveOrder" />
  </F7Page>
</template>

<script setup lang="ts">
import type { OrderRow } from "@/domains/sales/sales.repository";
import DemoBusLog from "@/modules/demo/components/DemoBusLog.vue";
import DemoCreateOrderSheet from "@/modules/demo/components/DemoCreateOrderSheet.vue";
import DemoOrderList from "@/modules/demo/components/DemoOrderList.vue";
import DemoPipelineBenchmark from "@/modules/demo/components/DemoPipelineBenchmark.vue";
import DemoStatCards from "@/modules/demo/components/DemoStatCards.vue";
import { useReactiveDemo } from "@/modules/demo/composables/useReactiveDemo";

const { t } = useI18n();
const createOpen = ref(false);

const {
  stats,
  orders,
  loading,
  busy,
  busLog,
  pipeline,
  measuring,
  readsPerRun,
  isNative,
  platform,
  seed,
  advance,
  setStatus,
  remove,
  save,
  clear,
  measurePipelining,
} = useReactiveDemo();

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return;
  await action();
}

/** Tapping a row opens the full set; swiping it is the shortcut for the common one. */
function openActions(order: OrderRow) {
  f7.actions
    .create({
      buttons: [
        [
          // `label: true` renders the entry as a heading rather than a button.
          { text: `${order.reference} · ${order.customerName}`, label: true },
          {
            text: t("demo.confirm"),
            onClick: () => void setStatus(order.id, "confirmed"),
          },
          {
            text: t("demo.deliver"),
            onClick: () => void setStatus(order.id, "delivered"),
          },
          {
            text: t("demo.backToDraft"),
            onClick: () => void setStatus(order.id, "draft"),
          },
          {
            text: t("demo.delete"),
            color: "red",
            onClick: () => void remove(order.id),
          },
        ],
        [{ text: t("demo.cancel"), strong: true, close: true }],
      ],
    })
    .open();
}

async function onSaveOrder(payload: Parameters<typeof save>[0]): Promise<void> {
  await save(payload);
  createOpen.value = false;
}
</script>

<style scoped>
/*
 * The shell's tab bar is outside this page, so Framework7 does not know to lift the FAB above it.
 */
.demo-fab {
  bottom: calc(var(--f7-tabbar-height, 56px) + 16px);
}
</style>
