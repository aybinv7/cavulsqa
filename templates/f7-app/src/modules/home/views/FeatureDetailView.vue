<template>
  <F7Page v-if="feature">
    <F7Navbar
      :title="t(feature.titleKey)"
      :subtitle="t(feature.subtitleKey)"
      :large="feature.navbar.large"
      :transparent="feature.navbar.transparent"
      :hide-on-scroll="feature.navbar.hideOnScroll"
      back-link
    >
      <F7Subnavbar v-if="feature.navbar.subnavbar">
        <F7Segmented strong>
          <F7Button :active="pane === 'what'" @click="pane = 'what'">
            {{ t("detail.what") }}
          </F7Button>
          <F7Button :active="pane === 'how'" @click="pane = 'how'">
            {{ t("detail.how") }}
          </F7Button>
        </F7Segmented>
      </F7Subnavbar>
    </F7Navbar>

    <F7Block strong inset class="rounded-2xl!">
      <div class="flex items-start gap-3">
        <F7Icon :f7="feature.icon" :color="feature.color" size="28" />
        <p class="m-0">{{ pane === "what" ? t(feature.textKey) : t("detail.howText") }}</p>
      </div>
    </F7Block>

    <F7BlockTitle>{{ t("detail.thisScreen") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem :title="t('detail.transition')" :after="feature.transition">
        <template #media><F7Icon f7="arrow_left_arrow_right" color="blue" /></template>
        <template #footer>{{ t("detail.transitionNote") }}</template>
      </F7ListItem>
      <F7ListItem :title="t('detail.navbar')" :after="navbarSummary">
        <template #media><F7Icon f7="rectangle_grid_1x2_fill" color="purple" /></template>
        <template #footer>{{ t("detail.navbarNote") }}</template>
      </F7ListItem>
      <F7ListItem :title="t('detail.nesting')" :after="t('detail.nestingAfter')">
        <template #media><F7Icon f7="square_stack_3d_down_right_fill" color="green" /></template>
        <template #footer>{{ t("detail.nestingNote") }}</template>
      </F7ListItem>
    </F7List>

    <!-- Enough content that hide-on-scroll and the collapsing large title have something to do. -->
    <F7BlockTitle>{{ t("detail.scrollMe") }}</F7BlockTitle>
    <F7List strong inset dividers class="rounded-2xl!">
      <F7ListItem
        v-for="line in 12"
        :key="line"
        :title="`${t('detail.row')} ${String(line)}`"
        :after="String(line)"
      />
    </F7List>

    <F7Block>
      <F7Button large fill @click="openNext">{{ t("detail.next") }}</F7Button>
    </F7Block>
  </F7Page>

  <F7Page v-else>
    <F7Navbar :title="t('errors.notFoundTitle')" back-link />
    <F7Block strong inset class="rounded-2xl!">
      <p class="m-0">{{ t("errors.notFound") }}</p>
    </F7Block>
  </F7Page>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { features, findFeature } from "@/modules/home/composables/useHomeFeatures";

const { t } = useI18n();

// Framework7 passes the route and this view's router to a route component as props.
const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();

const feature = computed(() => findFeature(String(props.f7route.params.id ?? "")));
const pane = ref<"what" | "how">("what");

const navbarSummary = computed(() => {
  if (!feature.value) return "";
  const parts: string[] = [];
  if (feature.value.navbar.large) parts.push("large");
  if (feature.value.navbar.transparent) parts.push("transparent");
  if (feature.value.navbar.hideOnScroll) parts.push("hide-on-scroll");
  if (feature.value.navbar.subnavbar) parts.push("subnavbar");
  return parts.length ? parts.join(" + ") : "plain";
});

/** Pushes the next feature onto this tab's own history, so the stack grows inside the tab. */
function openNext() {
  const index = features.findIndex((entry) => entry.id === feature.value?.id);
  const next = features[(index + 1) % features.length];
  if (!next) return;
  props.f7router.navigate(`/home/feature/${next.id}/`, { transition: next.transition });
}
</script>
