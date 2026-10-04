<template>
  <section :aria-label="label">
    <h3 class="type-title-small m-0 px-1 pb-2 text-on-surface-variant">{{ label }}</h3>
    <ul class="chat-recent m-0 flex list-none gap-2 overflow-x-auto p-0">
      <li v-for="(photo, index) in photos" :key="photo.src" class="shrink-0">
        <button
          type="button"
          class="chat-recent__photo m3-focus-ring rounded-lg"
          :aria-label="sendLabel(photo.alt)"
          @click="emit('pick', index)"
        >
          <img
            :src="photo.src"
            :alt="photo.alt"
            class="size-full object-cover"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { PhotoItem } from "@cavulsqa/m3e-vue";

defineProps<{
  photos: readonly PhotoItem[];
  label: string;
  sendLabel: (alt: string) => string;
}>();

const emit = defineEmits<{ pick: [index: number] }>();
</script>

<style scoped>
.chat-recent {
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
}

.chat-recent__photo {
  display: block;
  width: 88px;
  height: 88px;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: var(--md-sys-color-surface-container-highest);
  scroll-snap-align: start;
  cursor: pointer;
  transition: scale var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.chat-recent__photo:active {
  scale: 0.94;
}
</style>
