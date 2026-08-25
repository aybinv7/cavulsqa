<template>
  <F7App v-bind="parameters">
    <!-- Right panel: the query metrics, reachable from anywhere instead of owning a screen. -->
    <F7Panel right cover>
      <F7View>
        <MetricsPanel />
      </F7View>
    </F7Panel>

    <F7Views tabs class="safe-areas">
      <F7Toolbar tabbar icons bottom :class="{ 'tabbar-hidden': !isVisible }">
        <!--
          `toolbar-pane` is a Framework7 9 class that framework7-vue 8 does not wrap as a
          component, so it is written as a plain div. The CSS is what produces the floating pane.
        -->
        <div class="toolbar-pane">
          <F7Link
            v-for="(tab, index) in tabs"
            :key="tab.id"
            :tab-link="`#view-${tab.id}`"
            :tab-link-active="index === 0"
            :icon-ios="`f7:${tab.iconIos}`"
            :icon-md="`material:${tab.iconMd}`"
            :text="t(tab.labelKey)"
          />
        </div>
      </F7Toolbar>

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
  </F7App>
</template>

<script setup lang="ts">
import { tabs } from "@/app/tabs";
import { initCapacitor } from "@/plugins/capacitor";
import { hideSplashScreen } from "@/plugins/capacitor/useSplashScreen";
import { framework7Parameters } from "@/plugins/framework7.plugin";
import { useAppThemeProvider } from "@/shared/composables/theme/useAppTheme";
import MetricsPanel from "@/shared/components/metrics/MetricsPanel.vue";

const { t } = useI18n();
const { isVisible } = useTabbarVisibility();

// Provided here so any screen can read or change it through useAppTheme().
const appTheme = useAppThemeProvider();
const parameters = framework7Parameters(appTheme.value.theme, appTheme.value.darkMode === "dark");

onMounted(() => {
  // The native handlers need the Framework7 instance, which exists only once the shell is mounted.
  f7ready(async (instance) => {
    await initCapacitor(instance);
    hideSplashScreen();
  });
});
</script>

<style>
/* The tab bar gets out of the way while the keyboard is open; see useKeyboard. */
.tabbar-hidden {
  transform: translateY(100%);
  transition: transform 200ms ease;
}
</style>
