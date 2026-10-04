<script setup lang="ts">
import M3NavigationRail from "./M3NavigationRail.vue";
import M3SideSheet from "../sheet/M3SideSheet.vue";

/**
 * The modal expanded navigation rail: M3 Expressive's replacement for the modal navigation drawer.
 * It slides in from the start edge over a scrim with full-width destinations, and closes itself
 * once one is chosen. Use it on compact windows when there are more destinations than a bar holds,
 * or from a menu button on a collapsed rail.
 *
 * @see https://m3.material.io/components/navigation-rail/specs
 */
const props = withDefaults(defineProps<{ label?: string; closeLabel?: string; width?: number }>(), {
  label: "Navigation",
  closeLabel: "Close navigation",
  width: 300,
});

const open = defineModel<boolean>("open", { default: false });
const selected = defineModel<string>("selected");

function choose(value: string | undefined) {
  selected.value = value;
  open.value = false;
}
</script>

<template>
  <M3SideSheet
    v-model:open="open"
    side="start"
    :width="props.width"
    :label="props.label"
    :close-label="props.closeLabel"
    class="m3-modal-navigation-rail"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <M3NavigationRail
      expanded
      :expanded-width="props.width"
      :label="props.label"
      :model-value="selected"
      class="m3-modal-navigation-rail__rail"
      @update:model-value="choose"
      @reselect="open = false"
    >
      <slot />
    </M3NavigationRail>
  </M3SideSheet>
</template>

<style scoped>
.m3-modal-navigation-rail__rail.m3-modal-navigation-rail__rail {
  width: 100%;
  height: auto;
  padding-top: 8px;
  background: transparent;
}
</style>
