<script setup lang="ts">
import ChatBubble from "./ChatBubble.vue";
import ChatTyping from "./ChatTyping.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, shallowRef, useTemplateRef } from "vue";
import { useHaptics } from "../../composables/services.js";
import { useConversationScroll } from "../../composables/useConversationScroll.js";
import {
  conversationRows,
  type ChatMessage,
  type MessageRow,
  type MessageStatus,
} from "../../utils/messages.js";

/**
 * Framework7's messages: a conversation drawn as Material 3 bubbles - the owner's at the end edge
 * in the primary container, everyone else's at the start. Consecutive messages from one author
 * group, tightening the corners they share; a divider marks each new day; one to three emoji alone
 * are drawn large without a bubble. The group's last message shows its time, the newest sent one
 * its delivery status, and a tap on any bubble reveals its time. A failed message offers a retry.
 *
 * It scrolls with the page (or whatever scrolls around it): it opens at the newest message and
 * follows new ones while the reader is at the end. A reader scrolled back keeps their place as
 * messages arrive below or older pages load above - put an `M3InfiniteScroll edge="start"` in the
 * `#before` slot - and a button returns to the end with a count of what arrived meanwhile. Pair it
 * with `M3MessageBar`, whose height it leaves clear. Long-press (or right-click) emits `hold` for a
 * message menu; tapping an image emits `press`.
 *
 * It renders every message it is given: page older history in rather than passing thousands.
 */
const props = withDefaults(
  defineProps<{
    messages: readonly ChatMessage[];
    label: string;
    locale?: string;
    authors?: boolean;
    typing?: boolean | { author?: string; avatar?: string };
    groupWindow?: number;
    youLabel?: string;
    retryLabel?: string;
    latestLabel?: string;
    statusLabels?: Partial<Record<MessageStatus, string>>;
    typingLabel?: (author: string | undefined) => string;
    unreadLabel?: (count: number) => string;
  }>(),
  {
    authors: false,
    typing: false,
    groupWindow: 5 * 60_000,
    youLabel: "You",
    retryLabel: "Tap to retry",
    latestLabel: "Jump to the latest message",
    typingLabel: (author: string | undefined) => (author ? `${author} is typing` : "Typing"),
    unreadLabel: (count: number) => (count === 1 ? "1 new message" : `${count} new messages`),
  },
);

const emit = defineEmits<{
  hold: [message: ChatMessage, event: MouseEvent];
  press: [message: ChatMessage];
  retry: [message: ChatMessage];
}>();

defineSlots<{ before?: () => unknown; empty?: () => unknown }>();

const STATUS: Record<MessageStatus, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not sent",
};

const root = useTemplateRef<HTMLElement>("root");
const haptics = useHaptics();
const revealed = shallowRef<string | number | null>(null);

const rows = computed(() =>
  conversationRows(props.messages, { locale: props.locale, groupWindow: props.groupWindow }),
);
const owners = computed(() => {
  const own = new Set<string | number>();
  for (const message of props.messages) if (message.sent) own.add(message.id);
  return own;
});

const { far, unread, fresh, jump } = useConversationScroll({
  root,
  keys: () => props.messages.map((message) => message.id),
  isOwn: (key) => owners.value.has(key),
});

const typist = computed(() => (typeof props.typing === "object" ? props.typing : {}));
const jumpLabel = computed(() =>
  unread.value > 0 ? props.unreadLabel(unread.value) : props.latestLabel,
);

function statusLabel(row: MessageRow): string {
  const status = row.message.status;
  return status ? (props.statusLabels?.[status] ?? STATUS[status]) : "";
}

function speaker(row: MessageRow): string {
  return row.message.sent ? props.youLabel : (row.message.author ?? "");
}

function toggle(key: string | number) {
  revealed.value = revealed.value === key ? null : key;
}

function hold(message: ChatMessage, event: MouseEvent) {
  haptics.confirm();
  emit("hold", message, event);
}
</script>

<template>
  <div ref="root" class="m3-messages">
    <slot name="before" />
    <ol class="m3-messages__log" role="log" :aria-label="props.label">
      <template v-for="row in rows" :key="row.key">
        <li v-if="row.kind === 'day'" class="m3-messages__day">
          <span>{{ row.label }}</span>
        </li>
        <ChatBubble
          v-else
          :row="row"
          :authors="props.authors"
          :revealed="revealed === row.key"
          :fresh="fresh.has(row.key)"
          :speaker="speaker(row)"
          :status-label="statusLabel(row)"
          :retry-label="props.retryLabel"
          @toggle="toggle(row.key)"
          @hold="hold(row.message, $event)"
          @press="emit('press', row.message)"
          @retry="emit('retry', row.message)"
        />
      </template>
    </ol>
    <slot v-if="props.messages.length === 0" name="empty" />
    <ChatTyping
      v-if="props.typing"
      :authors="props.authors"
      :author="typist.author"
      :avatar="typist.avatar"
      :label="props.typingLabel(typist.author)"
    />
    <div class="m3-messages__dock">
      <Transition name="m3-messages-jump">
        <button
          v-if="far || unread > 0"
          type="button"
          class="m3-messages__jump m3-state m3-focus-ring"
          :class="{ 'm3-messages__jump--count': unread > 0 }"
          :aria-label="jumpLabel"
          @click="jump"
        >
          <M3Glyph name="arrowDown" :size="20" />
          <span v-if="unread > 0" aria-hidden="true">{{ jumpLabel }}</span>
        </button>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.m3-messages {
  display: flex;
  flex-direction: column;
  min-height: var(--m3-messages-min-height, 0);
  padding-top: 8px;
  padding-bottom: calc(var(--m3-message-bar-height, 0px) + 12px);
}

.m3-messages__log {
  display: flex;
  flex-direction: column;
  margin: auto 0 0;
  padding: 0;
  list-style: none;
}

.m3-messages__day {
  display: flex;
  justify-content: center;
  padding: 20px 16px 4px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-messages__dock {
  position: sticky;
  bottom: calc(var(--m3-message-bar-height, 0px) + 16px);
  z-index: 1;
  height: 0;
}

.m3-messages__jump {
  position: absolute;
  inset-inline-end: 16px;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: auto;
  min-width: 40px;
  height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level2, 0 2px 6px rgb(0 0 0 / 0.2));
  cursor: pointer;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  transition:
    padding var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-messages__jump--count {
  padding: 0 16px 0 12px;
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.m3-messages-jump-enter-active,
.m3-messages-jump-leave-active {
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-messages-jump-enter-from,
.m3-messages-jump-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
</style>
