<template>
  <M3FullScreenDialog
    v-model:open="open"
    :title="t('gallery.overlays.newCustomer')"
    :confirm-label="t('gallery.overlays.save')"
    :confirm-disabled="!form.name.trim()"
    :close-label="t('shell.dismiss')"
    :dismissible="!dirty"
    @confirm="save"
    @close="confirmDiscard"
  >
    <div class="flex flex-col gap-4">
      <M3TextField
        v-model="form.name"
        :label="t('gallery.overlays.customerName')"
        autocomplete="organization"
      />
      <M3TextField
        v-model="form.phone"
        :label="t('gallery.overlays.phone')"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
      />
      <M3ExposedDropdown
        v-model="form.wilaya"
        editable
        :label="t('gallery.inputs.wilaya')"
        :options="WILAYA_OPTIONS"
        :no-results-text="t('gallery.inputs.noMatches')"
      />
      <M3TextField v-model="form.note" :label="t('gallery.overlays.note')" multiline :rows="4" />
    </div>
  </M3FullScreenDialog>
</template>

<script setup lang="ts">
import { WILAYA_OPTIONS } from "@/modules/gallery/composables/wilayas";

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ saved: [name: string] }>();
const { t } = useI18n();
const dialog = useDialog();

const blank = () => ({ name: "", phone: "", wilaya: null as number | null, note: "" });
const form = reactive(blank());
const dirty = computed(() => Boolean(form.name || form.phone || form.note) || form.wilaya !== null);

watch(open, (value) => {
  if (value) Object.assign(form, blank());
});

function save() {
  emit("saved", form.name.trim());
  Object.assign(form, blank());
  open.value = false;
}

async function confirmDiscard() {
  if (!dirty.value) return;
  const discard = await dialog.confirm({
    headline: t("gallery.overlays.discardTitle"),
    text: t("gallery.overlays.discardText"),
    confirmLabel: t("gallery.overlays.discard"),
    dismissLabel: t("gallery.overlays.keepEditing"),
    destructive: true,
  });
  if (!discard) return;
  Object.assign(form, blank());
  open.value = false;
}
</script>
