<template>
  <div class="grid grid-cols-5 gap-3 px-4" role="radiogroup" :aria-label="t('studio.seed')">
    <button
      v-for="preset in SEED_PRESETS"
      :key="preset.id"
      type="button"
      role="radio"
      class="m3-focus-ring grid aspect-square place-items-center rounded-full"
      :aria-checked="isSelected(preset.seed)"
      :aria-label="t(preset.labelKey)"
      :style="{ color: preset.seed }"
      @click="emit('select', preset.seed)"
    >
      <M3ShapeMorph
        :shape="isSelected(preset.seed) ? 'cookie9Sided' : 'circle'"
        :rotate="isSelected(preset.seed) ? 30 : 0"
        class="size-full max-w-14"
      >
        <i-ms-check-rounded
          class="size-6 text-white transition-opacity duration-spring-fast ease-fast-effects"
          :class="isSelected(preset.seed) ? 'opacity-100' : 'opacity-0'"
        />
      </M3ShapeMorph>
    </button>
  </div>
</template>

<script setup lang="ts">
import { SEED_PRESETS } from "@/app/theme.config";

/**
 * The preset seeds as shapes that morph from a circle into a cookie when chosen. The swatch is the
 * raw seed, the one place a hex value reaches the screen, because the point is to show the input
 * before Material turns it into a scheme.
 */
const props = defineProps<{ selected: string }>();
const emit = defineEmits<{ select: [seed: string] }>();
const { t } = useI18n();

const isSelected = (seed: string) => seed.toLowerCase() === props.selected.toLowerCase();
</script>
