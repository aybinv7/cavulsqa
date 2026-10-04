<template>
  <section class="mx-4 flex flex-col gap-3 rounded-lg bg-surface-container-low p-4">
    <header class="flex flex-col gap-0.5">
      <h3 class="type-title-medium-emphasized m-0">{{ t("demo.bus") }}</h3>
      <p class="type-body-small m-0 text-on-surface-variant">{{ t("demo.busHint") }}</p>
    </header>
    <TransitionGroup
      v-if="entries.length"
      tag="ul"
      name="bus"
      class="m-0 flex list-none flex-col gap-0.5 p-0"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="flex items-center justify-between rounded-xs bg-surface-container px-3 py-2 first:rounded-t-md last:rounded-b-md"
      >
        <span class="type-label-large"
          >{{ entry.table }}<span class="text-on-surface-variant">.{{ entry.type }}</span></span
        >
        <span class="type-label-small tabular-nums text-on-surface-variant">{{
          formatTime(entry.at)
        }}</span>
      </li>
    </TransitionGroup>
    <p v-else class="type-body-medium m-0 text-on-surface-variant">{{ t("demo.busEmpty") }}</p>
  </section>
</template>

<script setup lang="ts">
import type { BusEntry } from "@/modules/demo/composables/useReactiveDemo";

defineProps<{ entries: BusEntry[] }>();
const { t } = useI18n();

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour12: false });
}
</script>

<style scoped>
.bus-enter-active {
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.bus-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.bus-move {
  transition: transform var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.bus-leave-active {
  display: none;
}
</style>
