<template>
  <M3AttachSheet
    v-model:open="open"
    :options="options"
    :label="t('gallery.chat.attachTitle')"
    :title="t('gallery.chat.attachTitle')"
    @select="choose"
  >
    <template #recent>
      <ChatRecentPhotos
        v-if="photos.length"
        :photos="photos"
        :label="t('gallery.chat.recent')"
        :send-label="(alt) => t('gallery.chat.sendPhoto', { name: alt })"
        @pick="pickRecent"
      />
    </template>
  </M3AttachSheet>
  <input ref="gallery" type="file" accept="image/*" multiple hidden @change="receive" />
  <input ref="camera" type="file" accept="image/*" capture="environment" hidden @change="receive" />
  <input ref="file" type="file" hidden @change="receive" />
</template>

<script setup lang="ts">
import type { AttachOption, MessageImage, PhotoItem } from "@cavulsqa/m3e-vue";
import { markRaw } from "vue";
import BallotIcon from "~icons/material-symbols/ballot-outline-rounded";
import CameraIcon from "~icons/material-symbols/photo-camera-outline-rounded";
import ContactIcon from "~icons/material-symbols/person-outline-rounded";
import EventIcon from "~icons/material-symbols/event-outline-rounded";
import FileIcon from "~icons/material-symbols/description-outline-rounded";
import GalleryIcon from "~icons/material-symbols/photo-library-outline-rounded";
import LocationIcon from "~icons/material-symbols/location-on-outline-rounded";
import ChatRecentPhotos from "@/modules/gallery/components/chat/ChatRecentPhotos.vue";
import type { ComposeKind } from "@/modules/gallery/composables/composeKind";
import { useLocalAttachments } from "@/modules/gallery/composables/useLocalAttachments";

defineProps<{ photos: readonly PhotoItem[] }>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{
  image: [image: MessageImage];
  text: [text: string];
  recent: [index: number];
  failed: [name: string];
  compose: [kind: ComposeKind];
}>();

const { t, locale } = useI18n();
const { toImage, describe } = useLocalAttachments();
const pickers = {
  gallery: useTemplateRef<HTMLInputElement>("gallery"),
  camera: useTemplateRef<HTMLInputElement>("camera"),
  file: useTemplateRef<HTMLInputElement>("file"),
};

const OPTIONS = [
  { id: "gallery", icon: GalleryIcon, tone: "primary", shape: "cookie9Sided" },
  { id: "camera", icon: CameraIcon, tone: "tertiary", shape: "clover4Leaf" },
  { id: "file", icon: FileIcon, tone: "secondary", shape: "gem" },
  { id: "location", icon: LocationIcon, tone: "primary", shape: "softBurst" },
  { id: "contact", icon: ContactIcon, tone: "secondary", shape: "puffy" },
  { id: "poll", icon: BallotIcon, tone: "tertiary", shape: "pentagon" },
  { id: "event", icon: EventIcon, tone: "primary", shape: "sunny" },
] as const;

const options = computed<AttachOption[]>(() =>
  OPTIONS.map((option) => ({
    ...option,
    icon: markRaw(option.icon),
    label: t(`gallery.chat.attachOptions.${option.id}`),
  })),
);

function choose(id: string) {
  if (id === "gallery" || id === "camera" || id === "file") {
    const input = pickers[id].value;
    if (input) {
      input.value = "";
      input.click();
    }
    return;
  }
  if (id === "location" || id === "contact" || id === "poll" || id === "event") emit("compose", id);
}

function pickRecent(index: number) {
  open.value = false;
  emit("recent", index);
}

async function receive(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const image = await toImage(file);
      if (image) emit("image", image);
      else emit("failed", file.name);
    } else {
      emit("text", describe(file, locale.value));
    }
  }
}
</script>
