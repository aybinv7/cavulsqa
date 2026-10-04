<script setup lang="ts">
import M3Button from "../button/M3Button.vue";
import M3LoadingIndicator from "../progress/M3LoadingIndicator.vue";
import { useTemplateRef } from "vue";
import { useInfiniteScroll } from "../../composables/useInfiniteScroll.js";

/**
 * Place it after a list to load the next page as the end comes near - Framework7's infinite
 * scroll. `load` returns a promise and resolves `false` once there is nothing more. While a page
 * loads it shows the loading indicator; a failed page shows `errorText` and a retry button instead
 * of trying again by itself; `endText`, when given, closes the list. The status is announced.
 * Call the exposed `reset()` after replacing the list, such as on a new filter or a refresh.
 * With `edge="start"` it sits above a list and loads what came before - a conversation's history.
 */
const props = withDefaults(
  defineProps<{
    load: () => Promise<boolean | void>;
    distance?: number;
    edge?: "start" | "end";
    disabled?: boolean;
    loadingLabel?: string;
    errorText?: string;
    retryLabel?: string;
    endText?: string;
  }>(),
  {
    distance: 200,
    edge: "end",
    disabled: false,
    loadingLabel: "Loading more",
    errorText: "Could not load more",
    retryLabel: "Retry",
  },
);

const sentinel = useTemplateRef<HTMLElement>("sentinel");
const { state, retry, reset } = useInfiniteScroll({
  sentinel,
  load: () => props.load(),
  distance: () => props.distance,
  edge: () => props.edge,
  enabled: () => !props.disabled,
});

defineExpose({ reset, retry });
</script>

<template>
  <div ref="sentinel" class="m3-infinite-scroll" role="status" aria-live="polite">
    <M3LoadingIndicator v-if="state === 'loading'" :size="40" :label="props.loadingLabel" />
    <template v-else-if="state === 'error'">
      <span class="m3-infinite-scroll__text">{{ props.errorText }}</span>
      <M3Button variant="tonal" size="s" @click="retry">{{ props.retryLabel }}</M3Button>
    </template>
    <span v-else-if="state === 'done' && props.endText" class="m3-infinite-scroll__text">{{
      props.endText
    }}</span>
  </div>
</template>

<style scoped>
.m3-infinite-scroll {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 1px;
  padding: 16px 16px calc(16px + var(--m3-infinite-scroll-inset, 0px));
}

.m3-infinite-scroll__text {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}
</style>
