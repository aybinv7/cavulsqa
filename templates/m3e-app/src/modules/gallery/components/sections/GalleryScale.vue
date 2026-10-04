<template>
  <M3PullToRefresh :refresh="refresh" :label="t('gallery.scale.refreshing')" />

  <GalleryBlock
    :title="t('gallery.scale.virtual')"
    :note="t('gallery.scale.virtualNote', { count: rows.length })"
  >
    <M3Chip :label="t('gallery.scale.rendered', { count: rendered }, rendered)">
      <template #icon><i-ms-speed-rounded /></template>
    </M3Chip>
    <M3Chip :label="t('gallery.scale.refreshed', { count: refreshes })">
      <template #icon><i-ms-refresh-rounded /></template>
    </M3Chip>
  </GalleryBlock>

  <div class="h-3" />
  <M3VirtualList
    ref="list"
    :items="rows"
    :item-size="74"
    :item-key="(row) => row.id"
    inset
    :label="t('gallery.scale.virtual')"
  >
    <template #default="{ item }">
      <M3ListItem
        as="div"
        clickable
        :headline="item.title"
        :supporting="item.subtitle"
        :trailing-text="item.amount"
      >
        <template #leading>
          <M3Shape :shape="item.shape" class="size-10" :class="TONE_CLASSES[item.tone]">
            <span class="type-label-large">{{ item.initials }}</span>
          </M3Shape>
        </template>
      </M3ListItem>
    </template>
  </M3VirtualList>
</template>

<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { ComponentPublicInstance } from "vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import { TONE_CLASSES, type Tone } from "@/shared/utils/tone";

const { t } = useI18n();
const snackbar = useSnackbar();

const SHAPES: readonly MaterialShapeName[] = [
  "cookie9Sided",
  "clover4Leaf",
  "pentagon",
  "sunny",
  "gem",
];
const TONES: readonly Tone[] = ["primary", "secondary", "tertiary"];
const CITIES = ["Alger", "Oran", "Constantine", "Annaba", "Blida", "Sétif", "Tlemcen", "Béjaïa"];
const COUNT = 5000;
const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const refreshes = ref(0);
const rows = shallowRef(build(0));

function build(seed: number) {
  return Array.from({ length: COUNT }, (_, index) => {
    const n = (index * 7919 + seed * 104729) % 100000;
    const city = CITIES[n % CITIES.length]!;
    return {
      id: index,
      title: `${t("gallery.scale.customer")} ${String(index + 1).padStart(4, "0")}`,
      subtitle: `${city} · ${t("gallery.scale.orders", { count: (n % 40) + 1 }, (n % 40) + 1)}`,
      amount: formatter.format((n % 9000) + 100),
      initials: city.slice(0, 2).toUpperCase(),
      shape: SHAPES[index % SHAPES.length]!,
      tone: TONES[index % TONES.length]!,
    };
  });
}

/** How many rows are actually in the DOM - the number that proves virtualisation works. */
const list = useTemplateRef<ComponentPublicInstance>("list");
const rendered = ref(0);
let observer: MutationObserver | null = null;
onMounted(() => {
  const element = list.value?.$el as HTMLElement | undefined;
  if (!element) return;
  const count = () => (rendered.value = element.childElementCount);
  count();
  observer = new MutationObserver(count);
  observer.observe(element, { childList: true });
});
onBeforeUnmount(() => observer?.disconnect());

async function refresh() {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  refreshes.value += 1;
  rows.value = build(refreshes.value);
  void snackbar.show(t("gallery.scale.updated"));
}
</script>
