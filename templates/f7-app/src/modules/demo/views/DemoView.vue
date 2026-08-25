<template>
  <F7Page>
    <F7Navbar :title="t('demo.title')" :sliding="true">
      <F7NavRight>
        <F7Link icon-f7="chart_bar_alt_fill" panel-open="right" />
      </F7NavRight>
    </F7Navbar>

    <!-- Two panes instead of one long scroll: the actions used to sit below all of this. -->
    <F7Toolbar tabbar top>
      <F7Link :tab-link-active="pane === 'data'" @click="pane = 'data'">
        {{ t("demo.data") }}
      </F7Link>
      <F7Link :tab-link-active="pane === 'diagnostics'" @click="pane = 'diagnostics'">
        {{ t("demo.diagnostics") }}
      </F7Link>
    </F7Toolbar>

    <template v-if="pane === 'data'">
      <F7Searchbar
        :placeholder="t('demo.searchPlaceholder')"
        :value="search"
        :clear-button="true"
        :disable-button="false"
        @input="onSearch"
        @searchbar:clear="search = ''"
      />

      <DemoStatCards :stats="stats" class="mt-3" />

      <F7BlockTitle>
        {{ t("demo.orders") }}
        <span v-if="loading" class="ml-2 text-xs opacity-60">{{ t("demo.refetching") }}</span>
      </F7BlockTitle>

      <DemoOrderList v-if="orders.length" :orders="orders" @advance="advance" />
      <F7Block v-else strong inset class="rounded-2xl!">
        <p class="m-0 text-sm opacity-70">{{ search ? t("demo.noMatches") : t("demo.empty") }}</p>
      </F7Block>

      <F7Block class="text-center">
        <p class="m-0 text-sm opacity-50">{{ t("demo.tapRow") }}</p>
      </F7Block>
    </template>

    <template v-else>
      <DemoBusLog :entries="busLog" />
      <DemoPipelineBenchmark
        :result="pipeline"
        :measuring="measuring"
        :reads-per-run="readsPerRun"
        :is-native="isNative"
        :platform="platform"
        @measure="measurePipelining"
      />
    </template>

    <!--
      The FAB morphs into the panel below rather than opening a separate modal - Framework7 animates
      the button's own bounds into the target, so the control becomes the surface it opened.
    -->
    <F7Fab slot="fixed" position="right-bottom" morph-to=".demo-actions-sheet">
      <F7Icon f7="plus" />
      <F7Icon f7="xmark" />
    </F7Fab>

    <div slot="fixed" class="demo-actions-sheet fab-morph-target">
      <F7List class="m-0!">
        <F7ListItem :title="t('demo.seed')" link="#" @click="run(seed)">
          <template #media><F7Icon f7="wand_stars" color="purple" /></template>
        </F7ListItem>
        <F7ListItem :title="t('demo.addOrder')" link="#" @click="run(addOrder)">
          <template #media><F7Icon f7="plus_rectangle_fill" color="teal" /></template>
        </F7ListItem>
        <F7ListItem :title="t('demo.clear')" link="#" @click="run(clear)">
          <template #media><F7Icon f7="trash_fill" color="red" /></template>
        </F7ListItem>
      </F7List>
    </div>
  </F7Page>
</template>

<script setup lang="ts">
import DemoBusLog from "@/modules/demo/components/DemoBusLog.vue";
import DemoOrderList from "@/modules/demo/components/DemoOrderList.vue";
import DemoPipelineBenchmark from "@/modules/demo/components/DemoPipelineBenchmark.vue";
import DemoStatCards from "@/modules/demo/components/DemoStatCards.vue";
import { useReactiveDemo } from "@/modules/demo/composables/useReactiveDemo";

const { t } = useI18n();
const pane = ref<"data" | "diagnostics">("data");

const {
  search,
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
  addOrder,
  advance,
  clear,
  measurePipelining,
} = useReactiveDemo();

function onSearch(event: Event) {
  search.value = (event.target as HTMLInputElement).value;
}

/**
 * Close the morphed panel first, so the FAB animates back while the write runs. The element is
 * named explicitly - `close()` with no argument relies on a default this version does not document.
 */
async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return;
  f7.fab.close(".fab");
  await action();
}
</script>

<style scoped>
/*
 * A morph target must be a sized, positioned box: Framework7 animates the FAB's own bounds into
 * these, so without dimensions the button expands into nothing.
 */
.demo-actions-sheet {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 1;
  width: 240px;
  overflow: hidden;
  border-radius: 16px;
  background: var(--f7-list-bg-color, var(--f7-page-bg-color));
  box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
}
</style>
