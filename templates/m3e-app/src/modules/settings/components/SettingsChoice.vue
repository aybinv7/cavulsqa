<template>
  <div
    class="flex flex-col gap-3 rounded-xs bg-surface-container-low px-4 py-4 first:rounded-t-lg last:rounded-b-lg"
  >
    <div class="flex items-center gap-3">
      <span class="text-on-surface-variant [&>svg]:size-6"><slot name="icon" /></span>
      <div class="flex min-w-0 flex-col">
        <span class="type-body-large text-on-surface">{{ props.label }}</span>
        <span v-if="props.supporting" class="type-body-medium text-on-surface-variant">{{
          props.supporting
        }}</span>
      </div>
    </div>
    <M3ButtonGroup variant="connected" size="s" :label="props.label">
      <M3Button
        v-for="option in props.options"
        :key="option.value"
        variant="tonal"
        toggle
        :selected="model === option.value"
        @update:selected="model = option.value"
      >
        <template v-if="option.icon" #icon><component :is="option.icon" /></template>
        {{ option.label }}
      </M3Button>
    </M3ButtonGroup>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import type { ChoiceOption } from "@/modules/settings/types";

/**
 * One setting with a few exclusive choices: a label and a connected button group, the M3
 * Expressive replacement for segmented buttons. Sits in a segmented stack with its siblings.
 */
const props = defineProps<{
  label: string;
  supporting?: string;
  options: readonly ChoiceOption<T>[];
}>();
const model = defineModel<T>({ required: true });
</script>
