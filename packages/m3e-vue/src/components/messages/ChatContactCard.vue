<script setup lang="ts">
import ChatAvatar from "./ChatAvatar.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import type { MessageContact } from "../../utils/messages.js";

/** A shared person or business as a card; a tap emits `open`, for the app to show them. */
const props = defineProps<{ contact: MessageContact; label: string }>();
const emit = defineEmits<{ open: [] }>();
</script>

<template>
  <button
    type="button"
    class="m3-chat-contact m3-state m3-focus-ring"
    :aria-label="`${props.label}: ${props.contact.name}`"
    @click.stop="emit('open')"
  >
    <ChatAvatar class="m3-chat-contact__avatar" :name="props.contact.name" />
    <span class="m3-chat-contact__text">
      <span class="m3-chat-contact__name"
        ><span dir="auto">{{ props.contact.name }}</span></span
      >
      <span v-if="props.contact.detail" class="m3-chat-contact__detail"
        ><span dir="auto">{{ props.contact.detail }}</span></span
      >
    </span>
    <M3Glyph name="chevronRight" class="m3-chat-contact__chevron" />
  </button>
</template>

<style scoped>
.m3-chat-contact {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 12px 10px 12px 14px;
  border: 0;
  background: none;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.m3-chat-contact__avatar {
  flex: none;
}

.m3-chat-contact__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.m3-chat-contact__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-chat-contact__detail {
  opacity: 0.8;
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-chat-contact__chevron {
  flex: none;
  opacity: 0.7;
}

:global([dir="rtl"] .m3-chat-contact__chevron) {
  transform: scaleX(-1);
}
</style>
