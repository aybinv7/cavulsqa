<template>
  <F7Page
    ref="page"
    :name="props.name"
    class="app-page"
    @page:beforeout="leave"
    :class="{ 'app-page--has-fab': $slots.fab }"
  >
    <M3TopAppBar
      :title="props.title"
      :subtitle="props.subtitle"
      :variant="props.variant ?? (props.back ? 'small' : 'large')"
      :scroll-behavior="props.scrollBehavior ?? SCROLL_BEHAVIOR.topAppBar"
    >
      <template v-if="props.back" #navigation>
        <M3IconButton :label="t('shell.back')" @click="goBack">
          <i-ms-arrow-back-rounded class="rtl:-scale-x-100" />
        </M3IconButton>
      </template>
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
      <template v-if="$slots.bottom" #bottom><slot name="bottom" /></template>
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
import { useHideOnScroll } from "@cavulsqa/m3e-vue";
import { SCROLL_BEHAVIOR, type ScrollBehaviorConfig } from "@/app/scroll.config";

/**
 * Every routed screen is an `AppPage`: the Framework7 page (lifecycle, transitions, the scroller)
 * with an M3 top app bar pinned in it and the right bottom padding for whatever floats above the
 * content. A tab root gets the large flexible bar; a pushed page (`back`) gets the small bar with a
 * back button and hides the navigation bar for as long as it is mounted.
 *
 * Slots: `actions` (trailing icon buttons in the bar), `bottom` (tabs or a filter pinned under the
 * bar - Framework7's subnavbar), default (the content), `fab` (positioned
 * above the navigation bar and the gesture area), `fixed` (anything else outside the scroller).
 *
 * The bars follow `SCROLL_BEHAVIOR`: a small bar slides away with the content (`scrollBehavior`
 * overrides it per page), and a tab root's scrolling hides the navigation bar - only while that
 * page is the one on screen, and never past the page leaving.
 */
const props = defineProps<{
  title: string;
  subtitle?: string;
  variant?: "small" | "medium" | "large";
  back?: boolean;
  name?: string;
  scrollBehavior?: ScrollBehaviorConfig["topAppBar"];
}>();

const { t } = useI18n();
const page = useTemplateRef<ComponentPublicInstance>("page");
const pageElement = computed(() => (page.value?.$el as HTMLElement | undefined) ?? null);
const router = useViewRouter(pageElement);

if (props.back) useHiddenNavigation();

const content = shallowRef<HTMLElement | null>(null);
const { setScrollHidden } = useNavigationVisibility();
const onScreen = () =>
  !!pageElement.value?.classList.contains("page-current") &&
  !!pageElement.value.closest(".view.tab-active");
const navigationHide = useHideOnScroll(content, {
  enabled: () => SCROLL_BEHAVIOR.navigationBar === "hideOnScroll" && !props.back && onScreen(),
});

watch(navigationHide.hidden, (hidden) => {
  if (onScreen()) setScrollHidden(hidden);
});

onMounted(() => {
  content.value = pageElement.value?.querySelector<HTMLElement>(":scope > .page-content") ?? null;
});

function leave() {
  navigationHide.reset();
  setScrollHidden(false);
}

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
