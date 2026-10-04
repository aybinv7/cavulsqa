<template>
  <section
    class="mx-4 mt-2 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-primary-container p-6 text-on-primary-container"
  >
    <div class="flex min-w-0 flex-col gap-2">
      <span class="type-label-large text-on-primary-container/80">{{ t("home.overline") }}</span>
      <h2 class="type-headline-medium-emphasized font-rounded m-0">{{ t("home.headline") }}</h2>
      <p class="type-body-medium m-0 text-on-primary-container/80">
        {{ t("home.intro", { app: appName }) }}
      </p>
    </div>
    <button
      type="button"
      class="m3-focus-ring grid size-28 place-items-center rounded-full text-primary"
      :aria-label="t('home.morph')"
      @click="next"
    >
      <M3ShapeMorph :shape="shapes[index]!" :rotate="index * 45" class="size-28">
        <i-ms-auto-awesome-outline-rounded class="size-10 text-on-primary" />
      </M3ShapeMorph>
    </button>
    <M3ButtonGroup
      class="col-span-2 mt-2 flex-wrap max-[600px]:[&>.m3-button]:grow"
      size="m"
      :label="t('home.actions')"
    >
      <M3Button @click="emit('explore')">{{ t("home.explore") }}</M3Button>
      <M3Button variant="tonal" @click="emit('personalise')">{{ t("home.personalise") }}</M3Button>
    </M3ButtonGroup>
  </section>
</template>

<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";

/**
 * The first thing the app shows: what it is in one line, a shape that morphs when touched - the
 * Expressive idea in one gesture - and the two places worth going next.
 */
const emit = defineEmits<{ explore: []; personalise: [] }>();
const { t } = useI18n();
const appName = __APP_NAME__;

const shapes: readonly MaterialShapeName[] = [
  "cookie9Sided",
  "clover4Leaf",
  "sunny",
  "pentagon",
  "softBurst",
  "flower",
];
const index = ref(0);

function next() {
  index.value = (index.value + 1) % shapes.length;
}
</script>
