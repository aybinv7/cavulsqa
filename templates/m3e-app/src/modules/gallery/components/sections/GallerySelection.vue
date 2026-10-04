<template>
  <GalleryBlock
    :title="t('gallery.selection.switches')"
    :note="t('gallery.selection.switchesNote')"
  >
    <M3Switch v-model="wifi" :label="t('gallery.selection.wifi')" />
    <M3Switch v-model="bluetooth" icons :label="t('gallery.selection.bluetooth')" />
    <M3Switch v-model="airplane" both-icons :label="t('gallery.selection.airplane')" />
    <M3Switch :model-value="true" disabled :label="t('gallery.selection.locked')" />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.selection.checks')" :note="t('gallery.selection.checksNote')">
    <M3Checkbox v-model="terms" :label="t('gallery.selection.terms')" />
    <M3Checkbox :model-value="false" indeterminate :label="t('gallery.selection.partial')" />
    <M3Checkbox v-model="invalid" error :label="t('gallery.selection.required')" />
    <span class="mx-2 h-8 w-px bg-outline-variant" />
    <M3Radio
      v-for="size in SIZES"
      :key="size"
      v-model="cup"
      :value="size"
      :label="t(`gallery.selection.cups.${size}`)"
    />
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.selection.sliders')"
    :note="t('gallery.selection.slidersNote')"
    stack
  >
    <M3Slider v-model="volume" :label="t('gallery.selection.volume')" />
    <M3Slider
      v-model="steps"
      :label="t('gallery.selection.steps')"
      :min="0"
      :max="10"
      :step="1"
      ticks
      size="s"
    />
    <M3Slider v-model="brightness" :label="t('gallery.selection.brightness')" size="m">
      <template #icon><i-ms-light-mode-outline-rounded /></template>
    </M3Slider>
    <M3Slider v-model="brightness" :label="t('gallery.selection.brightness')" size="l" />
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.selection.range')"
    :note="t('gallery.selection.rangeNote')"
    stack
  >
    <M3RangeSlider
      v-model:start="priceFrom"
      v-model:end="priceTo"
      :min="0"
      :max="20000"
      :step="500"
      :min-distance="1000"
      :start-label="t('gallery.selection.priceFrom')"
      :end-label="t('gallery.selection.priceTo')"
      :format="(v) => money.format(v)"
    />
    <p class="type-body-medium m-0 text-on-surface-variant">
      {{ money.format(priceFrom) }} – {{ money.format(priceTo) }}
    </p>
    <M3RangeSlider
      v-model:start="hourFrom"
      v-model:end="hourTo"
      :min="6"
      :max="22"
      :step="1"
      ticks
      size="s"
      :start-label="t('gallery.selection.opensAt')"
      :end-label="t('gallery.selection.closesAt')"
      :format="(v) => `${v}:00`"
    />
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.selection.chips')" :note="t('gallery.selection.chipsNote')">
    <M3Chip
      v-for="filter in FILTERS"
      :key="filter"
      kind="filter"
      :label="t(`gallery.selection.filters.${filter}`)"
      :selected="filters.has(filter)"
      @update:selected="toggleFilter(filter)"
    />
    <M3Chip kind="assist" :label="t('gallery.selection.addEvent')" elevated>
      <template #icon><i-ms-add-rounded /></template>
    </M3Chip>
    <M3Chip
      v-for="tag in tags"
      :key="tag"
      kind="input"
      removable
      :label="tag"
      :remove-label="t('gallery.selection.remove')"
      @remove="tags = tags.filter((entry) => entry !== tag)"
    />
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const SIZES = ["small", "medium", "large"] as const;
const FILTERS = ["open", "nearby", "rated"] as const;

const wifi = ref(true);
const bluetooth = ref(false);
const airplane = ref(false);
const terms = ref(true);
const invalid = ref(false);
const cup = ref<(typeof SIZES)[number]>("medium");
const volume = ref(40);
const steps = ref(4);
const brightness = ref(70);
const priceFrom = ref(2000);
const priceTo = ref(12000);
const hourFrom = ref(8);
const hourTo = ref(18);
const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const filters = ref(new Set<(typeof FILTERS)[number]>(["open"]));
const tags = ref(["Alger", "Oran", "Constantine"]);

function toggleFilter(filter: (typeof FILTERS)[number]) {
  const next = new Set(filters.value);
  if (next.has(filter)) next.delete(filter);
  else next.add(filter);
  filters.value = next;
}
</script>
