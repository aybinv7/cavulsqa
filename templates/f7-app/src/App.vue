<template>
  <f7-app v-bind="parameters">
    <f7-views tabs class="safe-areas">
      <f7-toolbar tabbar icons bottom :class="{ 'tabbar-hidden': !isVisible }">
        <f7-link
          v-for="(tab, index) in tabs"
          :key="tab.id"
          :tab-link="`#view-${tab.id}`"
          :tab-link-active="index === 0"
          :icon-f7="tab.icon"
          :text="t(tab.labelKey)"
        />
      </f7-toolbar>

      <f7-view
        v-for="(tab, index) in tabs"
        :id="`view-${tab.id}`"
        :key="tab.id"
        :main="index === 0"
        :tab="true"
        :tab-active="index === 0"
        :url="`/${tab.id}/`"
      />
    </f7-views>
  </f7-app>
</template>

<script setup lang="ts">
import { tabs } from "@/app/tabs";
import { framework7Parameters } from "@/plugins/framework7.plugin";
import { initCapacitor } from "@/plugins/capacitor";
import { hideSplashScreen } from "@/plugins/capacitor/useSplashScreen";
import { useTabbarVisibility } from "@/shared/composables/useTabbarVisibility";

const { t } = useI18n();
const { isVisible } = useTabbarVisibility();
const parameters = framework7Parameters();

onMounted(() => {
  // The native handlers need the Framework7 instance, which only exists once the shell is mounted.
  f7ready(async (f7) => {
    await initCapacitor(f7);
    hideSplashScreen();
  });
});
</script>

<style>
/* The status bar overlays the web view, so the shell owns the space behind it. */
.safe-areas {
  padding-top: env(safe-area-inset-top);
}

.tabbar-hidden {
  transform: translateY(100%);
  transition: transform 200ms ease;
}
</style>
