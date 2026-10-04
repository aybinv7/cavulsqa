<script setup lang="ts">
import ChatAvatar from "./ChatAvatar.vue";

const props = defineProps<{ author?: string; avatar?: string; authors: boolean; label: string }>();
</script>

<template>
  <div class="m3-chat-typing">
    <ChatAvatar v-if="props.authors" :name="props.author" :src="props.avatar" />
    <span class="m3-chat-typing__bubble" aria-hidden="true">
      <span class="m3-chat-typing__dot" />
      <span class="m3-chat-typing__dot" />
      <span class="m3-chat-typing__dot" />
    </span>
    <span class="m3-visually-hidden" role="status">{{ props.label }}</span>
  </div>
</template>

<style scoped>
.m3-chat-typing {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px 0;
  animation: m3-chat-typing-in 320ms cubic-bezier(0.05, 0.7, 0.1, 1) both;
}

.m3-chat-typing__bubble {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--md-sys-shape-corner-large-increased, 20px);
  border-end-start-radius: var(--md-sys-shape-corner-extra-small, 4px);
  background: var(--m3-chat-received-container, var(--md-sys-color-surface-container-high));
}

.m3-chat-typing__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--md-sys-color-on-surface-variant);
  animation: m3-chat-typing-dot 1.2s ease-in-out infinite;
}

.m3-chat-typing__dot:nth-child(2) {
  animation-delay: 0.15s;
}

.m3-chat-typing__dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes m3-chat-typing-dot {
  0%,
  60%,
  100% {
    opacity: 0.4;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

@keyframes m3-chat-typing-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-chat-typing,
  .m3-chat-typing__dot {
    animation: none;
  }
}
</style>
