<template>
  <GalleryBlock
    :title="t('gallery.inputs.signature')"
    :note="t('gallery.inputs.signatureNote')"
    stack
  >
    <M3SignaturePad
      ref="pad"
      v-model:strokes="proof.strokes"
      :label="t('gallery.inputs.signatureLabel')"
      :placeholder="t('gallery.inputs.signHere')"
      :height="180"
    />
    <div class="flex flex-wrap gap-2">
      <M3Button variant="text" size="s" :disabled="!proof.strokes.length" @click="pad?.undo()">
        {{ t("gallery.inputs.undo") }}
      </M3Button>
      <M3Button variant="text" size="s" :disabled="!proof.strokes.length" @click="pad?.clear()">
        {{ t("gallery.inputs.clearSignature") }}
      </M3Button>
    </div>
    <M3TextField
      v-model="proof.name"
      :label="t('gallery.inputs.receivedBy')"
      :supporting="t('gallery.inputs.receivedByNote')"
      autocomplete="name"
    />
    <M3Button :disabled="!ready" @click="confirm">{{
      t("gallery.inputs.confirmDelivery")
    }}</M3Button>
    <img
      v-if="exported"
      :src="exported"
      :alt="t('gallery.inputs.exported')"
      class="w-full rounded-lg border border-outline-variant"
    />
  </GalleryBlock>
</template>

<script setup lang="ts">
import { useFormDraft, type SignatureStroke } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

interface SignaturePad {
  undo: () => void;
  clear: () => void;
  toDataURL: (type?: string, background?: string) => string;
}

const { t } = useI18n();
const snackbar = useSnackbar();
const pad = useTemplateRef<SignaturePad>("pad");
const proof = reactive({ strokes: [] as SignatureStroke[], name: "" });
const exported = ref("");
const { clear: clearDraft } = useFormDraft("gallery.proof", proof);

const ready = computed(() => proof.strokes.length > 0 && proof.name.trim().length > 0);

function confirm() {
  const surface = getComputedStyle(document.documentElement).getPropertyValue(
    "--md-sys-color-surface",
  );
  exported.value = pad.value?.toDataURL("image/png", surface.trim() || "#ffffff") ?? "";
  void snackbar.show(t("gallery.inputs.delivered", { name: proof.name.trim() }));
  proof.strokes = [];
  proof.name = "";
  void clearDraft();
}
</script>
