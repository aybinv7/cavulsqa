<template>
  <AppPage :title="t('demo.title')" name="demo">
    <template #actions>
      <M3IconButton :label="t('demo.searchTitle')" @click="f7router.navigate('/demo/search/')">
        <i-ms-search-rounded />
      </M3IconButton>
      <M3IconButton :label="t('metrics.title')" @click="metricsOpen = true">
        <i-ms-monitoring-rounded />
      </M3IconButton>
    </template>

    <M3Tabs
      v-model="pane"
      class="app-sticky-tabs sticky top-[calc(env(safe-area-inset-top)+64px)] z-[2] mb-3"
      :label="t('demo.title')"
    >
      <M3Tab value="data" :label="t('demo.data')" />
      <M3Tab value="diagnostics" :label="t('demo.diagnostics')" />
    </M3Tabs>

    <div v-show="pane === 'data'">
      <DemoStatCards :stats="stats" />

      <SectionHeader>
        <span class="flex items-center gap-2">
          {{ t("demo.orders") }}
          <M3LoadingIndicator v-if="loading" :size="24" :label="t('demo.refetching')" />
        </span>
      </SectionHeader>

      <DemoOrderList
        v-if="orders.length"
        :orders="orders"
        @open="openOrder"
        @more="orderActions"
        @advance="(order) => run(() => advance(order.id))"
        @delete="deleteOrder"
      />
      <EmptyState
        v-else
        shape="cookie6Sided"
        :headline="t('demo.emptyTitle')"
        :text="t('demo.empty')"
      >
        <template #icon><i-ms-receipt-long-outline-rounded class="size-10" /></template>
        <M3Button variant="tonal" :disabled="busy" @click="run(seed)">
          <template #icon><i-ms-wand-stars-rounded /></template>
          {{ t("demo.seed") }}
        </M3Button>
      </EmptyState>
    </div>

    <div v-show="pane === 'diagnostics'" class="flex flex-col gap-3">
      <DemoBusLog :entries="busLog" />
      <DemoPipelineBenchmark
        :result="pipeline"
        :measuring="measuring"
        :reads-per-run="readsPerRun"
        :is-native="isNative"
        :platform="platform"
        :engine-name="engineName"
        @measure="measurePipelining"
      />
      <DemoBenchmark />
    </div>

    <template v-if="pane === 'data'" #fab>
      <M3FabMenu
        v-model:open="fabOpen"
        :label="t('demo.actions')"
        :close-label="t('shell.dismiss')"
      >
        <template #icon><i-ms-add-rounded /></template>
        <M3FabMenuItem :index="2" :label="t('demo.newOrder')" @click="createOpen = true">
          <i-ms-edit-outline-rounded />
        </M3FabMenuItem>
        <M3FabMenuItem :index="1" :label="t('demo.seed')" @click="run(seed)">
          <i-ms-wand-stars-rounded />
        </M3FabMenuItem>
        <M3FabMenuItem :index="0" :label="t('demo.clear')" @click="resetData">
          <i-ms-delete-outline-rounded />
        </M3FabMenuItem>
      </M3FabMenu>
    </template>

    <template #fixed>
      <DemoCreateOrderSheet v-model:open="createOpen" :save="saveOrder" />
      <DemoMetricsSheet v-model:open="metricsOpen" />
    </template>
  </AppPage>
</template>

<script setup lang="ts">
import { markRaw } from "vue";
import type { ActionSheetGroup } from "@cavulsqa/m3e-vue";
import type { Router } from "framework7/types";
import DeleteIcon from "~icons/material-symbols/delete-outline-rounded";
import ShippingIcon from "~icons/material-symbols/local-shipping-outline-rounded";
import VerifiedIcon from "~icons/material-symbols/verified-outline-rounded";
import type { DraftLine, OrderRow } from "@/domains/sales/sales.repository";
import DemoBenchmark from "@/modules/demo/components/DemoBenchmark.vue";
import DemoBusLog from "@/modules/demo/components/DemoBusLog.vue";
import DemoCreateOrderSheet from "@/modules/demo/components/DemoCreateOrderSheet.vue";
import DemoMetricsSheet from "@/modules/demo/components/DemoMetricsSheet.vue";
import DemoOrderList from "@/modules/demo/components/DemoOrderList.vue";
import DemoPipelineBenchmark from "@/modules/demo/components/DemoPipelineBenchmark.vue";
import DemoStatCards from "@/modules/demo/components/DemoStatCards.vue";
import { useReactiveDemo } from "@/modules/demo/composables/useReactiveDemo";

const { t } = useI18n();
const props = defineProps<{ f7router: Router.Router }>();
const snackbar = useSnackbar();
const dialog = useDialog();
const actionSheet = useActionSheet();

const pane = ref<"data" | "diagnostics">("data");
const createOpen = ref(false);
const metricsOpen = ref(false);
const fabOpen = ref(false);

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
  engineName,
  seed,
  advance,
  remove,
  save,
  clear,
  measurePipelining,
} = useReactiveDemo();

/** Every action reports failure the same way, so a broken write is never silent. */
async function run(action: () => Promise<void>): Promise<boolean> {
  if (busy.value) return false;
  try {
    await action();
    return true;
  } catch (error) {
    console.error("[demo] action failed", error);
    void snackbar.show({ message: t("demo.actionFailed"), duration: "long" });
    return false;
  }
}

function openOrder(order: OrderRow) {
  props.f7router.navigate(`/demo/order/${String(order.id)}/`);
}

async function saveOrder(draft: { customerId: number; reference: string; lines: DraftLine[] }) {
  await save(draft);
  void snackbar.show(t("demo.saved", { reference: draft.reference }));
}

async function orderActions(order: OrderRow) {
  const next =
    order.status === "draft" ? "confirm" : order.status === "confirmed" ? "deliver" : null;
  const groups: ActionSheetGroup[] = [
    {
      items: [
        { id: "delete", label: t("demo.delete"), icon: markRaw(DeleteIcon), tone: "destructive" },
      ],
    },
  ];
  if (next) {
    groups.unshift({
      items: [
        {
          id: "advance",
          label: next === "confirm" ? t("demo.confirm") : t("demo.deliver"),
          icon: markRaw(next === "confirm" ? ShippingIcon : VerifiedIcon),
        },
      ],
    });
  }
  const choice = await actionSheet.open({
    title: order.reference,
    supporting: order.customerName,
    groups,
  });
  if (choice === "advance") await run(() => advance(order.id));
  if (choice === "delete") await deleteOrder(order);
}

async function deleteOrder(order: OrderRow) {
  if (await run(() => remove(order.id))) {
    void snackbar.show(t("demo.deleted", { reference: order.reference }));
  }
}

async function resetData() {
  const confirmed = await dialog.confirm({
    headline: t("demo.clearTitle"),
    text: t("demo.clearText"),
    confirmLabel: t("demo.clear"),
    dismissLabel: t("demo.cancel"),
    destructive: true,
  });
  if (confirmed) await run(clear);
}
</script>
