<script setup lang="ts">
import ChatAvatar from "./ChatAvatar.vue";
import ChatReactions from "./ChatReactions.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import { computed } from "vue";
import { isJumboEmoji, toDate, type MessageRow } from "../../utils/messages.js";
import type { GlyphName } from "../icon/glyphs.js";

const props = defineProps<{
  row: MessageRow;
  authors: boolean;
  revealed: boolean;
  fresh: boolean;
  speaker: string;
  statusLabel: string;
  retryLabel: string;
  reactionsLabel: string;
}>();

const emit = defineEmits<{
  toggle: [];
  hold: [event: MouseEvent];
  press: [];
  retry: [];
}>();

const STATUS_GLYPH: Record<string, GlyphName> = {
  sending: "clock",
  sent: "check",
  delivered: "doneAll",
  read: "doneAll",
  failed: "error",
};

const message = computed(() => props.row.message);
const failed = computed(() => message.value.sent && message.value.status === "failed");
const jumbo = computed(() => !message.value.image && isJumboEmoji(message.value.text));
const status = computed(() => {
  const value = message.value.status;
  if (!message.value.sent || !value) return null;
  return props.row.latestSent || value === "sending" || value === "failed" ? value : null;
});
const footer = computed(() => props.row.last || props.revealed || status.value !== null);
const iso = computed(() => toDate(message.value.at).toISOString());
const imageStyle = computed(() => {
  const image = message.value.image;
  return image ? { aspectRatio: `${image.width} / ${image.height}` } : undefined;
});
</script>

<template>
  <li
    class="m3-chat-row"
    :class="[
      message.sent ? 'm3-chat-row--sent' : 'm3-chat-row--received',
      {
        'm3-chat-row--first': props.row.first,
        'm3-chat-row--last': props.row.last,
        'm3-chat-row--fresh': props.fresh,
      },
    ]"
    :data-message-key="props.row.key"
  >
    <ChatAvatar
      v-if="props.authors && !message.sent"
      class="m3-chat-row__avatar"
      :class="{ 'm3-chat-row__avatar--hidden': !props.row.last }"
      :name="message.author"
      :src="message.avatar"
    />
    <div class="m3-chat-row__column">
      <span
        v-if="props.authors && !message.sent && props.row.first && message.author"
        class="m3-chat-row__author"
        aria-hidden="true"
        >{{ message.author }}</span
      >
      <div
        class="m3-chat-row__bubble"
        :class="{ 'm3-chat-row__bubble--reacted': message.reactions?.length }"
      >
        <div
          class="m3-chat-bubble"
          :class="{
            'm3-chat-bubble--jumbo': jumbo,
            'm3-chat-bubble--failed': failed,
            'm3-chat-bubble--image': message.image,
          }"
          @click="emit('toggle')"
          @contextmenu.prevent="emit('hold', $event)"
        >
          <span class="m3-visually-hidden">{{ props.speaker }}, {{ props.row.time }}:</span>
          <button
            v-if="message.image"
            type="button"
            class="m3-chat-bubble__image"
            :style="imageStyle"
            @click.stop="emit('press')"
          >
            <img
              :src="message.image.src"
              :alt="message.image.alt ?? ''"
              :width="message.image.width"
              :height="message.image.height"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </button>
          <p v-if="message.text" class="m3-chat-bubble__text">{{ message.text }}</p>
        </div>
        <ChatReactions
          v-if="message.reactions?.length"
          class="m3-chat-row__reactions"
          :reactions="message.reactions"
          :label="props.reactionsLabel"
        />
      </div>
      <button
        v-if="failed"
        type="button"
        class="m3-chat-row__footer m3-chat-row__footer--retry"
        @click="emit('retry')"
      >
        <M3Glyph name="error" :size="16" />
        <span>{{ props.statusLabel }} · {{ props.retryLabel }}</span>
      </button>
      <div v-else-if="footer" class="m3-chat-row__footer" aria-hidden="true">
        <time :datetime="iso">{{ props.row.time }}</time>
        <template v-if="status">
          <span>·</span>
          <M3Glyph
            :name="STATUS_GLYPH[status] ?? 'check'"
            :size="16"
            :class="{ 'm3-chat-row__read': status === 'read' }"
          />
          <span>{{ props.statusLabel }}</span>
        </template>
      </div>
      <span v-if="status && !failed" class="m3-visually-hidden">{{ props.statusLabel }}</span>
    </div>
  </li>
</template>

<style scoped>
.m3-chat-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-inline: 16px;
  margin-top: 2px;
}

.m3-chat-row--first {
  margin-top: 12px;
}

.m3-chat-row--sent {
  justify-content: flex-end;
}

.m3-chat-row__avatar {
  margin-bottom: 20px;
}

.m3-chat-row__avatar--hidden {
  visibility: hidden;
}

.m3-chat-row__column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  max-width: min(80%, 520px);
}

.m3-chat-row--sent .m3-chat-row__column {
  align-items: flex-end;
}

.m3-chat-row__author {
  margin: 0 12px 4px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-chat-row__bubble {
  position: relative;
  max-width: 100%;
}

.m3-chat-row__bubble--reacted {
  margin-bottom: 24px;
}

.m3-chat-row__reactions {
  position: absolute;
  bottom: -21px;
  inset-inline-end: 6px;
  z-index: 1;
}

.m3-chat-row--sent .m3-chat-row__reactions {
  inset-inline: 6px auto;
}

.m3-chat-bubble {
  --m3-chat-round: var(--md-sys-shape-corner-large-increased, 20px);
  --m3-chat-tight: var(--md-sys-shape-corner-extra-small, 4px);

  position: relative;
  max-width: 100%;
  overflow: hidden;
  border-radius: var(--m3-chat-round);
  background: var(--m3-chat-received-container, var(--md-sys-color-surface-container-high));
  color: var(--m3-chat-received-content, var(--md-sys-color-on-surface));
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.m3-chat-row--received .m3-chat-bubble {
  border-start-start-radius: var(--m3-chat-tight);
  border-end-start-radius: var(--m3-chat-tight);
}

.m3-chat-row--received.m3-chat-row--first .m3-chat-bubble {
  border-start-start-radius: var(--m3-chat-round);
}

.m3-chat-row--received.m3-chat-row--last .m3-chat-bubble {
  border-end-start-radius: var(--m3-chat-round);
}

.m3-chat-row--sent .m3-chat-bubble {
  border-start-end-radius: var(--m3-chat-tight);
  border-end-end-radius: var(--m3-chat-tight);
  background: var(--m3-chat-sent-container, var(--md-sys-color-primary-container));
  color: var(--m3-chat-sent-content, var(--md-sys-color-on-primary-container));
}

.m3-chat-row--sent.m3-chat-row--first .m3-chat-bubble {
  border-start-end-radius: var(--m3-chat-round);
}

.m3-chat-row--sent.m3-chat-row--last .m3-chat-bubble {
  border-end-end-radius: var(--m3-chat-round);
}

.m3-chat-bubble--failed {
  outline: 1px solid var(--md-sys-color-error);
  outline-offset: -1px;
}

.m3-chat-row .m3-chat-bubble--jumbo {
  background: none;
  overflow: visible;
}

.m3-chat-bubble__text {
  margin: 0;
  padding: 10px 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
}

.m3-chat-bubble--jumbo .m3-chat-bubble__text {
  padding: 0 4px;
  font-size: 44px;
  line-height: 1.2;
}

.m3-chat-bubble--image {
  width: min(260px, 64vw);
}

.m3-chat-bubble__image {
  display: block;
  width: 100%;
  max-height: 320px;
  padding: 0;
  margin: 0;
  overflow: hidden;
  border: 0;
  background: var(--md-sys-color-surface-container-highest);
  cursor: zoom-in;
}

.m3-chat-bubble__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.m3-chat-bubble__image:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
}

.m3-chat-row__footer {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 4px 8px 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) /
    var(--md-sys-typescale-label-small-line-height) var(--md-sys-typescale-label-small-font);
}

.m3-chat-row__footer--retry {
  width: auto;
  min-height: 32px;
  color: var(--md-sys-color-error);
  cursor: pointer;
}

.m3-chat-row__read {
  color: var(--md-sys-color-primary);
}

.m3-chat-row--fresh .m3-chat-bubble {
  animation: m3-chat-in 420ms cubic-bezier(0.05, 0.7, 0.1, 1) both;
  transform-origin: bottom left;
}

.m3-chat-row--fresh.m3-chat-row--sent .m3-chat-bubble,
:global([dir="rtl"] .m3-chat-row--fresh.m3-chat-row--received .m3-chat-bubble) {
  transform-origin: bottom right;
}

:global([dir="rtl"] .m3-chat-row--fresh.m3-chat-row--sent .m3-chat-bubble) {
  transform-origin: bottom left;
}

@keyframes m3-chat-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.86);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-chat-row--fresh .m3-chat-bubble {
    animation: none;
  }
}
</style>
