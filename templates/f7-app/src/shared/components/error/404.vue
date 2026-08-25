<template>
  <f7-page>
    <f7-navbar :title="t('errors.notFoundTitle')" />
    <f7-block strong class="text-center">
      <p class="m-0">{{ t("errors.notFound") }}</p>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
