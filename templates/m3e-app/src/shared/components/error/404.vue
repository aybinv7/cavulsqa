<template>
  <AppPage :title="t('errors.notFoundTitle')" back>
    <EmptyState
      shape="ghostish"
      :headline="t('errors.notFoundTitle')"
      :text="t('errors.notFound')"
    />
  </AppPage>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>
