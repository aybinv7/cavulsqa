<template>
  <GalleryBlock :title="t('gallery.inputs.search')" :note="t('gallery.inputs.searchNote')" stack>
    <M3SearchBar
      v-model="query"
      :placeholder="t('gallery.inputs.searchPlaceholder')"
      :clear-label="t('gallery.inputs.clear')"
    >
      <template #trailing>
        <M3IconButton :label="t('gallery.inputs.voice')"><i-ms-mic-outline-rounded /></M3IconButton>
      </template>
    </M3SearchBar>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.inputs.filled')" :note="t('gallery.inputs.filledNote')" stack>
    <M3TextField
      v-model="name"
      :label="t('gallery.inputs.name')"
      :supporting="t('gallery.inputs.nameHint')"
      autocomplete="name"
    >
      <template #leading><i-ms-person-outline-rounded /></template>
    </M3TextField>
    <M3TextField
      v-model="amount"
      :label="t('gallery.inputs.amount')"
      inputmode="decimal"
      suffix="DA"
      :error="amountError"
    />
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.inputs.outlined')"
    :note="t('gallery.inputs.outlinedNote')"
    stack
  >
    <M3TextField
      v-model="email"
      variant="outlined"
      :label="t('gallery.inputs.email')"
      type="email"
      autocomplete="email"
    />
    <M3TextField
      v-model="note"
      variant="outlined"
      multiline
      :rows="3"
      :maxlength="140"
      :label="t('gallery.inputs.note')"
    />
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const { t } = useI18n();
const query = ref("");
const name = ref("");
const amount = ref("12,5x");
const email = ref("");
const note = ref("");

const amountError = computed(() =>
  /^\d+([.,]\d{1,2})?$/.test(amount.value) || amount.value === ""
    ? undefined
    : t("gallery.inputs.amountInvalid"),
);
</script>

<style scoped>
/* The outlined field's floating label cuts its notch from the surface it sits on. */
section {
  --m3-text-field-notch: var(--md-sys-color-surface-container-low);
}
</style>
