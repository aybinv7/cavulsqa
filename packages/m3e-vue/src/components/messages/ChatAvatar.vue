<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { hashPick, initials } from "../../utils/messages.js";

const props = defineProps<{ name?: string; src?: string }>();

const TONES = ["primary", "secondary", "tertiary"] as const;
const failed = shallowRef(false);
watch(
  () => props.src,
  () => (failed.value = false),
);

const tone = computed(() => TONES[hashPick(props.name, TONES.length)]);
</script>

<template>
  <span class="m3-chat-avatar" :class="`m3-chat-avatar--${tone}`" aria-hidden="true">
    <img
      v-if="props.src && !failed"
      :src="props.src"
      alt=""
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
    <template v-else>{{ initials(props.name) }}</template>
  </span>
</template>

<style scoped>
.m3-chat-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-full);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) / 1
    var(--md-sys-typescale-label-medium-font);
}

.m3-chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.m3-chat-avatar--primary {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-chat-avatar--secondary {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-chat-avatar--tertiary {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}
</style>
