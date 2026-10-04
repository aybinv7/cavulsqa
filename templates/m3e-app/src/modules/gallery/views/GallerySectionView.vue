<template>
  <AppPage :title="entry ? t(entry.titleKey) : t('errors.notFoundTitle')" variant="medium" back>
    <Suspense v-if="entry">
      <component :is="entry.component" />
      <template #fallback>
        <div class="grid place-items-center py-16">
          <M3LoadingIndicator :label="t('gallery.loading')" />
        </div>
      </template>
    </Suspense>
    <EmptyState
      v-else
      shape="ghostish"
      :headline="t('errors.notFoundTitle')"
      :text="t('errors.notFound')"
    />
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { findSection } from "@/modules/gallery/composables/useGallerySections";

const props = defineProps<{ f7route: Router.Route }>();
const { t } = useI18n();
const entry = computed(() => findSection(String(props.f7route.params.section ?? "")));
</script>
