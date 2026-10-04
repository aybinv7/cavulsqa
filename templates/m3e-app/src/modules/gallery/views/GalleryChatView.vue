<template>
  <AppPage
    :title="t('gallery.chat.title')"
    :subtitle="t('gallery.chat.subtitle')"
    back
    variant="small"
    class="gallery-chat"
  >
    <M3Messages
      :messages="messages"
      :label="t('gallery.chat.title')"
      :locale="locale"
      :typing="typing"
      :you-label="t('gallery.chat.you')"
      :retry-label="t('gallery.chat.retry')"
      :latest-label="t('gallery.chat.latest')"
      :status-labels="statusLabels"
      :typing-label="typingLabel"
      :unread-label="unreadLabel"
      authors
      :reactions="REACTIONS"
      :actions="actions"
      :react-label="t('gallery.chat.react')"
      :menu-label="t('gallery.chat.messageActions')"
      :reactions-label="reactionsLabel"
      :reactions-title="t('gallery.chat.reactionsTitle')"
      :all-reactions-label="t('gallery.chat.allReactions')"
      :remove-reaction-label="t('gallery.chat.removeReaction')"
      :others-label="othersLabel"
      :card-labels="cardLabels"
      @react="react"
      @action="onAction"
      @press="openMessage"
      @retry="retry"
      @vote="vote"
      @rsvp="rsvp"
    >
      <template #before>
        <M3InfiniteScroll
          edge="start"
          :load="loadOlder"
          :loading-label="t('gallery.chat.loadingOlder')"
          :error-text="t('gallery.chat.loadFailed')"
          :retry-label="t('gallery.chat.retry')"
          :end-text="t('gallery.chat.start')"
        />
      </template>
    </M3Messages>

    <template #fixed>
      <M3MessageBar
        v-model="draft"
        :label="t('gallery.chat.compose')"
        :send-label="t('gallery.chat.send')"
        @send="send"
      >
        <template #leading>
          <M3IconButton
            :label="t('gallery.chat.attach')"
            :aria-expanded="attachOpen"
            @click="attachOpen = !attachOpen"
          >
            <i-ms-add-rounded class="chat-plus" :class="{ 'chat-plus--open': attachOpen }" />
          </M3IconButton>
        </template>
        <template #trailing>
          <M3IconButton :label="t('gallery.chat.thumbsUp')" @click="draft += '👍'">
            <i-ms-add-reaction-outline-rounded />
          </M3IconButton>
        </template>
      </M3MessageBar>

      <ChatAttachSheet
        v-model:open="attachOpen"
        :photos="photos"
        @image="sendImage"
        @text="send"
        @recent="sendPhoto"
        @failed="onFailed"
        @compose="compose"
      />
      <ChatPollComposer v-model:open="pollOpen" @send="sendPoll" />
      <ChatInviteComposer v-model:open="inviteOpen" @send="sendInvite" />
      <ChatContactPicker
        v-model:open="contactOpen"
        :customers="customers"
        :loading="customersLoading"
        :failed="customersFailed"
        @pick="sendContact"
      />

      <M3PhotoBrowser
        v-model:open="browserOpen"
        v-model:index="photoIndex"
        :photos="shared"
        :label="t('gallery.chat.photos')"
        :close-label="t('shell.dismiss')"
      />
    </template>
  </AppPage>
</template>

<script setup lang="ts">
import type {
  ChatMessage,
  MessageAction,
  MessageCardLabels,
  MessageReaction,
  MessageStatus,
  PhotoItem,
} from "@cavulsqa/m3e-vue";
import type { Router } from "framework7/types";
import { markRaw } from "vue";
import CopyIcon from "~icons/material-symbols/content-copy-outline-rounded";
import DeleteIcon from "~icons/material-symbols/delete-outline-rounded";
import ChatAttachSheet from "@/modules/gallery/components/chat/ChatAttachSheet.vue";
import ChatContactPicker from "@/modules/gallery/components/chat/ChatContactPicker.vue";
import ChatInviteComposer from "@/modules/gallery/components/chat/ChatInviteComposer.vue";
import ChatPollComposer from "@/modules/gallery/components/chat/ChatPollComposer.vue";
import type { ComposeKind } from "@/modules/gallery/composables/composeKind";
import { mapsLink } from "@/modules/gallery/composables/currentPosition";
import { openExternal } from "@/modules/gallery/composables/openExternal";
import { useChatCustomers } from "@/modules/gallery/composables/useChatCustomers";
import { useChatDemo } from "@/modules/gallery/composables/useChatDemo";
import { useLocationShare } from "@/modules/gallery/composables/useLocationShare";
import { usePhotoScenes } from "@/modules/gallery/composables/usePhotoScenes";

const props = defineProps<{ f7router: Router.Router }>();
const { t, locale } = useI18n();
const snackbar = useSnackbar();
const { photos } = usePhotoScenes((kind) => t(`gallery.carousels.scenes.${kind}`));
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"] as const;

const {
  messages,
  typing,
  draft,
  send,
  sendPhoto,
  sendImage,
  sendLocation,
  sendContact,
  sendPoll,
  sendInvite,
  vote,
  rsvp,
  react,
  retry,
  remove,
  loadOlder,
} = useChatDemo((index) => {
  const photo = photos.value[index % Math.max(1, photos.value.length)];
  if (!photo?.width || !photo.height) return null;
  return { src: photo.src, width: photo.width, height: photo.height, alt: photo.alt };
});

const browserOpen = ref(false);
const attachOpen = ref(false);
const pollOpen = ref(false);
const inviteOpen = ref(false);
const contactOpen = ref(false);

const {
  customers,
  loading: customersLoading,
  failed: customersFailed,
} = useChatCustomers(contactOpen);
const { share: shareLocation } = useLocationShare(sendLocation);

const cardLabels = computed<MessageCardLabels>(() => ({
  openLocation: t("gallery.chat.cards.openLocation"),
  openContact: t("gallery.chat.cards.openContact"),
  pollSingle: t("gallery.chat.cards.pollSingle"),
  pollMultiple: t("gallery.chat.cards.pollMultiple"),
  votes: (count: number) => t("gallery.chat.cards.votes", { count }, count),
  going: t("gallery.chat.cards.going"),
  maybe: t("gallery.chat.cards.maybe"),
  no: t("gallery.chat.cards.no"),
}));

const actions = computed<MessageAction[]>(() => [
  {
    id: "copy",
    label: t("gallery.chat.copy"),
    icon: markRaw(CopyIcon),
    when: (message) => Boolean(message.text),
  },
  {
    id: "delete",
    label: t("gallery.chat.delete"),
    icon: markRaw(DeleteIcon),
    tone: "destructive",
  },
]);
const photoIndex = ref(0);

const statusLabels = computed<Record<MessageStatus, string>>(() => ({
  sending: t("gallery.chat.status.sending"),
  sent: t("gallery.chat.status.sent"),
  delivered: t("gallery.chat.status.delivered"),
  read: t("gallery.chat.status.read"),
  failed: t("gallery.chat.status.failed"),
}));

const shared = computed<PhotoItem[]>(() =>
  messages.value.flatMap((message) =>
    message.image
      ? [{ ...message.image, alt: message.image.alt ?? "", caption: message.text }]
      : [],
  ),
);

function typingLabel(author: string | undefined) {
  return t("gallery.chat.typing", { name: author ?? "" });
}

function unreadLabel(count: number) {
  return t("gallery.chat.unread", { count }, count);
}

function compose(kind: ComposeKind) {
  if (kind === "location") void shareLocation();
  else if (kind === "contact") contactOpen.value = true;
  else if (kind === "poll") pollOpen.value = true;
  else inviteOpen.value = true;
}

function openMessage(message: ChatMessage) {
  if (message.location) openExternal(mapsLink(message.location.lat, message.location.lng));
  else if (message.contact)
    props.f7router.navigate(`/demo/search/?q=${encodeURIComponent(message.contact.name)}`);
  else if (message.image) openPhoto(message);
}

function openPhoto(message: ChatMessage) {
  const index = shared.value.findIndex((photo) => photo.src === message.image?.src);
  photoIndex.value = Math.max(0, index);
  browserOpen.value = true;
}

function reactionsLabel(reactions: readonly MessageReaction[]) {
  return reactions
    .map((reaction) =>
      t(
        "gallery.chat.reactionCount",
        { emoji: reaction.emoji, count: reaction.count ?? 1 },
        reaction.count ?? 1,
      ),
    )
    .join(", ");
}

function othersLabel(count: number) {
  return t("gallery.chat.othersReacted", { count }, count);
}

function onFailed(name: string) {
  void snackbar.show({ message: t("gallery.chat.attachFailed", { name }) });
}

async function onAction(message: ChatMessage, id: string) {
  if (id === "delete") {
    remove(message);
    return;
  }
  if (id !== "copy" || !message.text) return;
  try {
    await navigator.clipboard.writeText(message.text);
    void snackbar.show({ message: t("gallery.chat.copied") });
  } catch {
    void snackbar.show({ message: t("gallery.chat.copyFailed") });
  }
}
</script>

<style scoped>
.chat-plus {
  transition: rotate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.chat-plus--open {
  rotate: 45deg;
}

:global(.gallery-chat .page-content) {
  --m3-messages-min-height: calc(100% - 64px - env(safe-area-inset-top));

  padding-bottom: 0;
  scroll-padding-bottom: var(--m3-message-bar-height, 0px);
}
</style>
