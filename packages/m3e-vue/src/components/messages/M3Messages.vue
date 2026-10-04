<script setup lang="ts">
import ChatBubble from "./ChatBubble.vue";
import ChatLiftLayer from "./ChatLiftLayer.vue";
import ChatReactionsSheet from "./ChatReactionsSheet.vue";
import ChatTyping from "./ChatTyping.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, onMounted, onScopeDispose, shallowRef, useTemplateRef, watch } from "vue";
import { useHaptics } from "../../composables/services.js";
import { useConversationScroll } from "../../composables/useConversationScroll.js";
import { scrollableAncestor } from "../../utils/scroll.js";
import {
  conversationRows,
  type ChatMessage,
  type MessageReaction,
  type MessageRow,
  type MessageStatus,
} from "../../utils/messages.js";
import type { MessageAction } from "./types.js";

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
 * with `M3MessageBar`, whose height it leaves clear. Tapping an image emits `press`.
 *
 * Long-press (or right-click) lifts the bubble out of a dimmed screen with a pill of `reactions`
 * above it and the message's `actions` under it, emitting `react` and `action`; the reactions sit
 * on the bubble's edge, drawn from each message's `reactions`, and `applyReaction` computes the
 * next ones. Without either prop the long-press emits `hold` instead, for a menu of your own.
 * Tapping a message's reactions lists who reacted - names come from each reaction's `by` - and
 * the owner's own row takes their reaction off, as `react` with `null`.
 *
 * It renders the newest `windowSize` rows and more, a chunk at a time, as the reader scrolls up
 * toward them - the place they are reading stays put - so a new message costs the same in a
 * thread of two thousand as in one of twenty. Back at the end it drops the rows far above again.
 * The `#before` slot (older pages) appears once everything given is rendered.
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
    /** The emoji a long-press offers. */
    reactions?: readonly string[];
    actions?: readonly MessageAction[];
    reactLabel?: string;
    menuLabel?: string;
    reactionsLabel?: (reactions: readonly MessageReaction[]) => string;
    reactionsTitle?: string;
    allReactionsLabel?: string;
    removeReactionLabel?: string;
    othersLabel?: (count: number) => string;
    /** How many rows render from the end; more render as the reader scrolls up. */
    windowSize?: number;
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
    reactions: () => [],
    actions: () => [],
    windowSize: 60,
    reactLabel: "React",
    reactionsTitle: "Reactions",
    allReactionsLabel: "All",
    removeReactionLabel: "Tap to remove",
    othersLabel: (count: number) => (count === 1 ? "1 other" : `${count} others`),
    menuLabel: "Message actions",
    reactionsLabel: (reactions: readonly MessageReaction[]) =>
      reactions
        .map((reaction) =>
          (reaction.count ?? 1) > 1 ? `${reaction.emoji} ${reaction.count}` : reaction.emoji,
        )
        .join(", "),
  },
);

const emit = defineEmits<{
  hold: [message: ChatMessage, event: MouseEvent];
  press: [message: ChatMessage];
  retry: [message: ChatMessage];
  react: [message: ChatMessage, emoji: string | null];
  action: [message: ChatMessage, id: string];
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
const lift = useTemplateRef<InstanceType<typeof ChatLiftLayer>>("lift");
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

const {
  atEnd,
  far,
  unread,
  fresh,
  hold: holdPlace,
  jump,
} = useConversationScroll({
  root,
  keys: () => props.messages.map((message) => message.id),
  isOwn: (key) => owners.value.has(key),
});

const CHUNK = 40;
const SLACK = 20;
const REACH = 1200;
const DAY_SNAP = 20;

const sentinel = useTemplateRef<HTMLElement>("sentinel");
const renderFrom = shallowRef(0);
const shown = computed(() =>
  renderFrom.value > 0 ? rows.value.slice(renderFrom.value) : rows.value,
);

/** Where a window starting near `index` begins: at that day's divider when it is close above. */
function snap(index: number): number {
  const from = Math.max(0, index);
  for (let at = from; at >= Math.max(0, from - DAY_SNAP); at--) {
    if (rows.value[at]?.kind === "day") return at;
  }
  return from;
}

/** The first rendered row by key, so history added above it does not move the window. */
let startKey: string | number | null = null;

function startAt(index: number) {
  renderFrom.value = index;
  startKey = index > 0 ? (rows.value[index]?.key ?? null) : null;
}

const tail = () => snap(rows.value.length - props.windowSize);
const oversized = () => rows.value.length - renderFrom.value > props.windowSize + SLACK;

watch(
  () => props.messages,
  (next, previous) => {
    const first = previous?.[0]?.id;
    if (first === undefined || !next.some((message) => message.id === first)) {
      startAt(tail());
      return;
    }
    if (startKey !== null) {
      const at = rows.value.findIndex((row) => row.key === startKey);
      startAt(at >= 0 ? at : tail());
    }
    if (atEnd.value && oversized()) startAt(tail());
  },
  { immediate: true },
);

watch(atEnd, (end) => {
  if (end && oversized()) startAt(tail());
});

let growing = false;

function near(): boolean {
  const element = sentinel.value;
  if (!element) return false;
  const container = scrollableAncestor(element);
  const top = container ? container.getBoundingClientRect().top : 0;
  return element.getBoundingClientRect().bottom > top - REACH;
}

async function grow() {
  if (growing || renderFrom.value === 0) return;
  growing = true;
  await holdPlace(() => startAt(snap(renderFrom.value - CHUNK)));
  growing = false;
  if (renderFrom.value > 0 && near()) requestAnimationFrame(() => void grow());
}

let observer: IntersectionObserver | null = null;
onMounted(() => {
  if (typeof IntersectionObserver === "undefined" || !sentinel.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void grow();
    },
    { root: scrollableAncestor(sentinel.value), rootMargin: `${REACH}px 0px 0px 0px` },
  );
  observer.observe(sentinel.value);
});
onScopeDispose(() => observer?.disconnect());

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

const lifts = computed(() => props.reactions.length > 0 || props.actions.length > 0);
const reactionsOpen = shallowRef(false);
const reactionsOf = shallowRef<ChatMessage | null>(null);

function showReactions(message: ChatMessage) {
  reactionsOf.value = message;
  reactionsOpen.value = true;
}

watch(
  () => props.messages,
  (messages) => {
    const shown = reactionsOf.value;
    if (!shown) return;
    const current = messages.find((message) => message.id === shown.id);
    if (current !== shown) reactionsOf.value = current ?? null;
    if (!current?.reactions?.length) reactionsOpen.value = false;
  },
);

function hold(message: ChatMessage, event: MouseEvent) {
  haptics.confirm();
  const bubble = (event.target as Element | null)?.closest<HTMLElement>(".m3-chat-bubble");
  if (lifts.value && bubble && lift.value) {
    void lift.value.open(bubble, message);
    return;
  }
  emit("hold", message, event);
}
</script>

<template>
  <div ref="root" class="m3-messages">
    <slot v-if="renderFrom === 0" name="before" />
    <div ref="sentinel" class="m3-messages__sentinel" aria-hidden="true" />
    <ol class="m3-messages__log" role="log" :aria-label="props.label">
      <template v-for="row in shown" :key="row.key">
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
          :reactions-label="
            row.message.reactions?.length ? props.reactionsLabel(row.message.reactions) : ''
          "
          @toggle="toggle(row.key)"
          @hold="hold(row.message, $event)"
          @press="emit('press', row.message)"
          @retry="emit('retry', row.message)"
          @reactions="showReactions(row.message)"
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
    <ChatLiftLayer
      v-if="lifts"
      ref="lift"
      :reactions="props.reactions"
      :actions="props.actions"
      :react-label="props.reactLabel"
      :menu-label="props.menuLabel"
      @react="(message, emoji) => emit('react', message, emoji)"
      @action="(message, id) => emit('action', message, id)"
    />
    <ChatReactionsSheet
      v-model:open="reactionsOpen"
      :message="reactionsOf"
      :title="props.reactionsTitle"
      :all-label="props.allReactionsLabel"
      :you-label="props.youLabel"
      :remove-label="props.removeReactionLabel"
      :others-label="props.othersLabel"
      @remove="(message) => emit('react', message, null)"
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

.m3-messages__sentinel {
  height: 1px;
  margin-bottom: -1px;
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
