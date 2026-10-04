<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import { useTabPanels } from "./panelsContext.js";

/** One page of `M3TabPanels`, shown for the tab with the same `value`; it scrolls on its own. */
const props = defineProps<{ value: string; label?: string }>();

const panels = useTabPanels();
const unregister = panels.register(props.value);
const current = computed(() => panels.selected.value === props.value);

onBeforeUnmount(unregister);
</script>

<template>
  <section
    class="m3-tab-panel"
    role="tabpanel"
    :data-value="props.value"
    :aria-label="props.label"
    :aria-hidden="!current || undefined"
    :inert="!current"
    :tabindex="current ? 0 : -1"
  >
    <slot v-if="panels.rendered(props.value)" />
  </section>
</template>

<style scoped>
.m3-tab-panel {
  flex: 0 0 100%;
  box-sizing: border-box;
  min-width: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  touch-action: pan-y;
}
</style>
