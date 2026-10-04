<template>
  <AppPage :title="t('settings.title')" name="settings">
    <SectionHeader :title="t('settings.appearance')" />
    <M3List variant="segmented" inset>
      <M3ListItem
        clickable
        :headline="t('settings.colors')"
        :supporting="t(`studio.variants.${settings.variant}`)"
        @click="f7router.navigate('/settings/studio/')"
      >
        <template #leading>
          <M3Shape shape="cookie9Sided" class="size-10 bg-primary text-on-primary">
            <i-ms-palette-outline-rounded class="size-5" />
          </M3Shape>
        </template>
        <template #trailing><i-ms-chevron-right-rounded class="rtl:-scale-x-100" /></template>
      </M3ListItem>
    </M3List>

    <div class="mx-4 mt-0.5 flex flex-col gap-0.5">
      <SettingsChoice
        :model-value="settings.mode"
        :label="t('settings.darkMode')"
        :options="modeOptions"
        @update:model-value="(mode) => theme.update({ mode })"
      >
        <template #icon><component :is="modeIcon" /></template>
      </SettingsChoice>
      <SettingsChoice
        :model-value="settings.motion"
        :label="t('settings.motion')"
        :supporting="t('settings.motionNote')"
        :options="motionOptions"
        @update:model-value="(motion) => theme.update({ motion })"
      >
        <template #icon><i-ms-animation-rounded /></template>
      </SettingsChoice>
    </div>

    <SectionHeader :title="t('settings.general')" />
    <M3List variant="segmented" inset>
      <M3ListItem
        clickable
        :headline="t('settings.language')"
        :supporting="t(`settings.languages.${locale}`)"
        @click="chooseLanguage"
      >
        <template #leading><i-ms-language-rounded /></template>
      </M3ListItem>
    </M3List>

    <SectionHeader :title="t('settings.storage')" />
    <M3List variant="segmented" inset>
      <M3ListItem :headline="t('settings.engine')" :supporting="storage">
        <template #leading><i-ms-database-outline-rounded /></template>
      </M3ListItem>
      <M3ListItem
        v-if="!durable"
        :headline="t('settings.notDurable')"
        :supporting="tradeoff"
        multiline
        tone="destructive"
      >
        <template #leading><i-ms-info-outline-rounded /></template>
      </M3ListItem>
      <M3ListItem
        v-for="skip in skipped"
        :key="skip.id"
        :headline="skip.id"
        :supporting="skip.detail"
        multiline
      >
        <template #leading><i-ms-chevron-right-rounded class="rtl:-scale-x-100" /></template>
      </M3ListItem>
    </M3List>

    <SectionHeader :title="t('settings.about')" />
    <M3List variant="segmented" inset>
      <M3ListItem :headline="t('settings.appName')" :trailing-text="appName">
        <template #leading><i-ms-info-outline-rounded /></template>
      </M3ListItem>
      <M3ListItem :headline="t('settings.version')" :trailing-text="appVersion">
        <template #leading><i-ms-verified-outline-rounded /></template>
      </M3ListItem>
      <M3ListItem :headline="t('settings.platform')" :trailing-text="platform">
        <template #leading><i-ms-phone-android-outline-rounded /></template>
      </M3ListItem>
      <M3ListItem :headline="t('settings.webview')" :trailing-text="webview">
        <template #leading><i-ms-web-rounded /></template>
      </M3ListItem>
    </M3List>
  </AppPage>
</template>

<script setup lang="ts">
import { Capacitor } from "@capacitor/core";
import { markRaw } from "vue";
import type { Router } from "framework7/types";
import AutoIcon from "~icons/material-symbols/brightness-auto-outline-rounded";
import DarkIcon from "~icons/material-symbols/dark-mode-outline-rounded";
import LightIcon from "~icons/material-symbols/light-mode-outline-rounded";
import SettingsChoice from "@/modules/settings/components/SettingsChoice.vue";
import type { ChoiceOption } from "@/modules/settings/types";
import { LOCALES, setLocale, type AppLocale } from "@/plugins/i18n.plugin";
import { activeStorage, activeStorageLabel, storageAttempts } from "@/shared/database/database";
import { webviewVersion } from "@/shared/database/storage";
import type { ModeChoice, MotionChoice } from "@/shared/utils/theme/themeSettings";

defineProps<{ f7router: Router.Router }>();

const { t, locale } = useI18n();
const theme = useThemeSettings();
const settings = computed(() => theme.settings.value);
const actionSheet = useActionSheet();

const appName = __APP_NAME__;
const appVersion = __APP_VERSION__;
const platform = Capacitor.getPlatform();
const storage = activeStorageLabel();
const durable = activeStorage().durable;
const tradeoff = activeStorage().tradeoff;
const skipped = storageAttempts().filter((attempt) => attempt.outcome !== "opened");
const chromium = webviewVersion();
const webview = chromium === null ? t("settings.unknown") : `Chromium ${String(chromium)}`;

const modeOptions = computed<ChoiceOption<ModeChoice>[]>(() => [
  { value: "system", label: t("settings.modeSystem"), icon: markRaw(AutoIcon) },
  { value: "light", label: t("settings.modeLight"), icon: markRaw(LightIcon) },
  { value: "dark", label: t("settings.modeDark"), icon: markRaw(DarkIcon) },
]);

const modeIcon = computed(
  () => modeOptions.value.find((option) => option.value === settings.value.mode)?.icon ?? AutoIcon,
);

const motionOptions = computed<ChoiceOption<MotionChoice>[]>(() => [
  { value: "system", label: t("settings.motionSystem") },
  { value: "reduced", label: t("settings.motionReduced") },
  { value: "full", label: t("settings.motionFull") },
]);

async function chooseLanguage() {
  const choice = await actionSheet.open({
    title: t("settings.language"),
    groups: [
      {
        items: LOCALES.map((code) => ({
          id: code,
          label: t(`settings.languages.${code}`),
          selected: locale.value === code,
        })),
      },
    ],
  });
  if (choice) setLocale(choice as AppLocale);
}
</script>
