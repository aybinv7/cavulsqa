<template>
  <GalleryBlock :title="t('gallery.shapes.morph')" :note="t('gallery.shapes.morphNote')">
    <div class="grid w-full place-items-center py-2">
      <M3ShapeMorph :shape="selected" :rotate="turns * 30" class="size-40 text-primary">
        <span class="type-label-large text-on-primary">{{ selected }}</span>
      </M3ShapeMorph>
    </div>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.shapes.library')" :note="t('gallery.shapes.libraryNote')">
    <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3">
      <button
        v-for="shape in MATERIAL_SHAPES"
        :key="shape"
        type="button"
        class="m3-focus-ring flex flex-col items-center gap-1.5 rounded-md p-1"
        :aria-pressed="shape === selected"
        @click="pick(shape)"
      >
        <M3Shape
          :shape="shape"
          class="size-14 transition-colors duration-200"
          :class="shape === selected ? 'bg-primary' : 'bg-secondary-container'"
        />
        <span class="type-label-small w-full truncate text-center text-on-surface-variant">{{
          shape
        }}</span>
      </button>
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import { MATERIAL_SHAPES, type MaterialShapeName } from "@cavulsqa/m3e";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const selected = ref<MaterialShapeName>("cookie9Sided");
const turns = ref(0);
const haptics = useHaptics();

function pick(shape: MaterialShapeName) {
  if (shape === selected.value) return;
  selected.value = shape;
  turns.value += 1;
  haptics.tick();
}
</script>
