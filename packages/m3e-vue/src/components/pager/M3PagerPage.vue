<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { usePager } from "./context.js";

/**
 * One page of an `M3Pager`. Off-screen pages are inert, so focus and screen readers stay on the
 * page in view. `label` names it for screen readers; it defaults to its position, "2 / 4".
 */
const props = defineProps<{ label?: string }>();

const pager = usePager();
const root = useTemplateRef<HTMLElement>("root");
const index = computed(() => pager.indexOf(root.value));
let unregister: (() => void) | null = null;

onMounted(() => {
  if (root.value) unregister = pager.register(root.value);
});
onBeforeUnmount(() => unregister?.());
</script>

<template>
  <div
    ref="root"
    class="m3-pager-page"
    role="group"
    aria-roledescription="slide"
    :aria-label="props.label ?? `${index + 1} / ${pager.count.value}`"
    :inert="index !== pager.current.value"
  >
    <slot />
  </div>
</template>

<style scoped>
.m3-pager-page {
  flex: 0 0 100%;
  box-sizing: border-box;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
</style>
