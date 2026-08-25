<template>
  <F7Page>
    <F7Navbar :title="t('settings.title')" large transparent :sliding="true" />

    <F7BlockTitle>{{ t("settings.appearance") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem
        :title="t('settings.theme')"
        smart-select
        :smart-select-params="{ openIn: 'sheet', closeOnSelect: true }"
      >
        <template #media><F7Icon f7="paintbrush_fill" color="pink" /></template>
        <select :value="appTheme.theme" @change="onThemeChange">
          <option value="auto">{{ t("settings.themeAuto") }}</option>
          <option value="ios">iOS</option>
          <option value="md">Material</option>
        </select>
      </F7ListItem>

      <F7ListItem :title="t('settings.darkMode')">
        <template #media><F7Icon f7="moon_fill" color="deeppurple" /></template>
        <template #after>
          <F7Toggle :checked="appTheme.darkMode === 'dark'" @change="onDarkModeChange" />
        </template>
      </F7ListItem>

      <F7ListItem
        :title="t('settings.language')"
        smart-select
        :smart-select-params="{ openIn: 'popover', closeOnSelect: true }"
      >
        <template #media><F7Icon f7="globe" color="blue" /></template>
        <select :value="locale" @change="onLocaleChange">
          <option v-for="option in availableLocales" :key="option" :value="option">
            {{ option.toUpperCase() }}
          </option>
        </select>
      </F7ListItem>
    </F7List>

    <F7BlockTitle>{{ t("settings.tryIt") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem :title="t('settings.testToast')" link="#" @click="testToast">
        <template #media><F7Icon f7="bell_fill" color="orange" /></template>
      </F7ListItem>
      <F7ListItem :title="t('settings.testDialog')" link="#" @click="testDialog">
        <template #media><F7Icon f7="exclamationmark_bubble_fill" color="red" /></template>
      </F7ListItem>
      <F7ListItem :title="t('settings.testSheet')" link="#" @click="testSheet">
        <template #media><F7Icon f7="rectangle_stack_fill" color="teal" /></template>
      </F7ListItem>
      <F7ListItem :title="t('settings.openMetrics')" panel-open="right" link="#">
        <template #media><F7Icon f7="chart_bar_alt_fill" color="blue" /></template>
      </F7ListItem>
    </F7List>

    <F7BlockTitle>{{ t("settings.about") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem :title="t('settings.appName')" :after="appName">
        <template #media><F7Icon f7="app_badge_fill" color="green" /></template>
      </F7ListItem>
      <F7ListItem :title="t('settings.version')" :after="appVersion">
        <template #media><F7Icon f7="number" color="gray" /></template>
      </F7ListItem>
      <F7ListItem :title="t('settings.platform')" :after="platform">
        <template #media><F7Icon f7="device_phone_portrait" color="purple" /></template>
      </F7ListItem>
      <F7ListItem :title="t('settings.aboutUs')" link="#" @click="showAbout">
        <template #media><F7Icon f7="info_circle_fill" color="blue" /></template>
      </F7ListItem>
    </F7List>

    <F7Block class="text-center">
      <p class="m-0 text-sm opacity-50">{{ t("settings.footer") }}</p>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import { Capacitor } from "@capacitor/core";
import { useAppTheme, type AppMode, type AppTheme } from "@/shared/composables/theme/useAppTheme";

const { t, locale, availableLocales } = useI18n();
const theme = useAppTheme();
const appTheme = computed(() => theme.value);

const appName = __APP_NAME__;
const appVersion = __APP_VERSION__;
const platform = Capacitor.getPlatform();

function onThemeChange(event: Event) {
  appTheme.value.setTheme((event.target as HTMLSelectElement).value as AppTheme);
}

function onDarkModeChange(event: Event) {
  const mode: AppMode = (event.target as HTMLInputElement).checked ? "dark" : "light";
  void appTheme.value.setDarkMode(mode);
}

function onLocaleChange(event: Event) {
  locale.value = (event.target as HTMLSelectElement).value;
}

function testToast() {
  f7.toast.create({ text: t("settings.toastText"), position: "center", closeTimeout: 1800 }).open();
}

function testDialog() {
  f7.dialog.confirm(t("settings.dialogText"), t("settings.dialogTitle"));
}

function testSheet() {
  f7.sheet
    .create({
      content: `
        <div class="sheet-modal">
          <div class="sheet-modal-inner">
            <div class="block"><p>${t("settings.sheetText")}</p></div>
          </div>
        </div>`,
      backdrop: true,
    })
    .open();
}

function showAbout() {
  f7.dialog.alert(t("settings.aboutText"), t("settings.aboutUs"));
}
</script>
