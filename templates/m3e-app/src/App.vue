<template>
  <F7App v-bind="parameters">
    <M3NavigationRail
      v-if="rail"
      class="app-shell__rail"
      :model-value="active"
      :expanded="railExpanded"
      :label="t('shell.navigation')"
      @update:model-value="selectTab"
      @reselect="reselect"
    >
      <template #header>
        <M3IconButton
          :label="railExpanded ? t('shell.collapse') : t('shell.expand')"
          @click="railExpanded = !railExpanded"
        >
          <i-ms-menu-rounded />
        </M3IconButton>
      </template>
      <M3NavigationItem v-for="tab in tabs" :key="tab.id" :value="tab.id" :label="t(tab.labelKey)">
        <template #icon="{ selected }">
          <component :is="selected ? tab.iconSelected : tab.icon" />
        </template>
      </M3NavigationItem>
    </M3NavigationRail>

    <F7Views tabs class="app-shell__views">
      <F7View
        v-for="(tab, index) in tabs"
        :id="`view-${tab.id}`"
        :key="tab.id"
        :main="index === 0"
        :tab="true"
        :tab-active="index === 0"
        :url="`/${tab.id}/`"
      />
    </F7Views>

    <M3NavigationBar
      v-if="!rail"
      class="app-shell__bar"
      :class="{ 'app-shell__bar--hidden': !navVisible }"
      :model-value="active"
      :label="t('shell.navigation')"
      :aria-hidden="!navVisible || undefined"
      :inert="!navVisible"
      @update:model-value="selectTab"
      @reselect="reselect"
    >
      <M3NavigationItem v-for="tab in tabs" :key="tab.id" :value="tab.id" :label="t(tab.labelKey)">
        <template #icon="{ selected }">
          <component :is="selected ? tab.iconSelected : tab.icon" />
        </template>
      </M3NavigationItem>
    </M3NavigationBar>

    <M3SnackbarHost :close-label="t('shell.dismiss')" />
    <M3NotificationHost :close-label="t('shell.dismiss')" :label="t('shell.notification')" />
    <M3DialogHost />
    <M3ActionSheetHost />
  </F7App>
</template>

<script setup lang="ts">
import { tabs } from "@/app/tabs";
import { initCapacitor } from "@/plugins/capacitor";
import { hideSplashWhenPageReady } from "@/plugins/capacitor/useSplashScreen";
import { framework7Parameters } from "@/plugins/framework7.plugin";

const { t } = useI18n();
const parameters = framework7Parameters();
const windowClass = useWindowClass();
const { active, show } = useActiveTab();
const { isVisible } = useNavigationVisibility();
const railExpanded = useLocalStorage("app-rail-expanded", false);

const rail = computed(() => windowClass.value !== "compact");
const navVisible = computed(() => !rail.value && isVisible.value);

/**
 * How much of the bottom edge the bar occupies, for everything that floats above it: page padding,
 * FABs, the floating toolbar, snackbars. One variable on the root, so nothing measures the bar.
 */
watchEffect(() => {
  const root = document.documentElement.style;
  root.setProperty("--app-nav-offset", navVisible.value ? "64px" : "0px");
  root.setProperty("--m3-snackbar-offset", navVisible.value ? "64px" : "0px");
  root.setProperty("--m3-floating-toolbar-offset", navVisible.value ? "64px" : "0px");
});

function selectTab(id: string | undefined) {
  if (id) show(id);
}

/** M3: tapping the current destination returns to its root, or scrolls its root to the top. */
function reselect(id: string) {
  const view = f7.views.get(`#view-${id}`);
  const router = view?.router;
  if (router && router.history.length > 1) {
    router.back(router.history[0], { force: true });
    return;
  }
  document
    .querySelector<HTMLElement>(`#view-${id} .page-current .page-content`)
    ?.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  f7ready(async (instance) => {
    useNavigationGuard();
    await initCapacitor(instance);
    hideSplashWhenPageReady(instance);
  });
});
</script>
