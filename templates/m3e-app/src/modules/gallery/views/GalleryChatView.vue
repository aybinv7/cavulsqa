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
      @hold="openActions"
      @press="openPhoto"
      @retry="retry"
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
          <M3IconButton :label="t('gallery.chat.attach')" @click="sendPhoto">
            <i-ms-add-photo-alternate-outline-rounded />
          </M3IconButton>
        </template>
        <template #trailing>
          <M3IconButton :label="t('gallery.chat.thumbsUp')" @click="draft += '👍'">
            <i-ms-add-reaction-outline-rounded />
          </M3IconButton>
        </template>
      </M3MessageBar>

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
import type { ChatMessage, MessageStatus, PhotoItem } from "@cavulsqa/m3e-vue";
import { markRaw } from "vue";
import CopyIcon from "~icons/material-symbols/content-copy-outline-rounded";
import DeleteIcon from "~icons/material-symbols/delete-outline-rounded";
import { useChatDemo } from "@/modules/gallery/composables/useChatDemo";
import { usePhotoScenes } from "@/modules/gallery/composables/usePhotoScenes";

const { t, locale } = useI18n();
const actionSheet = useActionSheet();
const snackbar = useSnackbar();
const { photos } = usePhotoScenes((kind) => t(`gallery.carousels.scenes.${kind}`));
const { messages, typing, draft, send, sendPhoto, retry, remove, loadOlder } = useChatDemo(
  (index) => {
    const photo = photos.value[index % Math.max(1, photos.value.length)];
    if (!photo?.width || !photo.height) return null;
    return { src: photo.src, width: photo.width, height: photo.height, alt: photo.alt };
  },
);

const browserOpen = ref(false);
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

function openPhoto(message: ChatMessage) {
  const index = shared.value.findIndex((photo) => photo.src === message.image?.src);
  photoIndex.value = Math.max(0, index);
  browserOpen.value = true;
}

async function openActions(message: ChatMessage) {
  const choice = await actionSheet.open({
    title: message.text ?? t("gallery.chat.photo"),
    groups: [
      {
        items: [
          ...(message.text
            ? [{ id: "copy", label: t("gallery.chat.copy"), icon: markRaw(CopyIcon) }]
            : []),
          {
            id: "delete",
            label: t("gallery.chat.delete"),
            icon: markRaw(DeleteIcon),
            tone: "destructive" as const,
          },
        ],
      },
    ],
  });
  if (choice === "delete") remove(message);
  if (choice === "copy" && message.text) {
    try {
      await navigator.clipboard.writeText(message.text);
      void snackbar.show({ message: t("gallery.chat.copied") });
    } catch {
      void snackbar.show({ message: t("gallery.chat.copyFailed") });
    }
  }
}
</script>

<style scoped>
:global(.gallery-chat .page-content) {
  --m3-messages-min-height: calc(100% - 64px - env(safe-area-inset-top));

  padding-bottom: 0;
  scroll-padding-bottom: var(--m3-message-bar-height, 0px);
}
</style>
