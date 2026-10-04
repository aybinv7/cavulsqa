<template>
  <F7Page
    ref="page"
    :name="props.name"
    class="app-page"
    :class="{ 'app-page--has-fab': $slots.fab }"
  >
    <M3TopAppBar
      :title="props.title"
      :subtitle="props.subtitle"
      :variant="props.variant ?? (props.back ? 'small' : 'large')"
    >
      <template v-if="props.back" #navigation>
        <M3IconButton :label="t('shell.back')" @click="goBack">
          <i-ms-arrow-back-rounded class="rtl:-scale-x-100" />
        </M3IconButton>
      </template>
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </M3TopAppBar>

    <slot />

    <template #fixed>
      <div v-if="$slots.fab" class="app-page__fab"><slot name="fab" /></div>
      <slot name="fixed" />
    </template>
  </F7Page>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";

/**
 * Every routed screen is an `AppPage`: the Framework7 page (lifecycle, transitions, the scroller)
 * with an M3 top app bar pinned in it and the right bottom padding for whatever floats above the
 * content. A tab root gets the large flexible bar; a pushed page (`back`) gets the small bar with a
 * back button and hides the navigation bar for as long as it is mounted.
 *
 * Slots: `actions` (trailing icon buttons in the bar), default (the content), `fab` (positioned
 * above the navigation bar and the gesture area), `fixed` (anything else outside the scroller).
 */
const props = defineProps<{
  title: string;
  subtitle?: string;
  variant?: "small" | "medium" | "large";
  back?: boolean;
  name?: string;
}>();

const { t } = useI18n();
const page = useTemplateRef<ComponentPublicInstance>("page");
const pageElement = computed(() => (page.value?.$el as HTMLElement | undefined) ?? null);
const router = useViewRouter(pageElement);

if (props.back) useHiddenNavigation();

function goBack() {
  router.back();
}
</script>

<style scoped>
.app-page__fab {
  position: absolute;
  inset-inline-end: 16px;
  bottom: calc(16px + var(--app-bottom-inset));
  z-index: 10;
  transition: bottom var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}
</style>
