<template>
  <InputsAccount />
  <InputsVerification />
  <InputsTags />

  <GalleryBlock
    :title="t('gallery.inputs.searchView')"
    :note="t('gallery.inputs.searchViewNote')"
    stack
  >
    <M3SearchView
      v-model="customerQuery"
      :placeholder="t('gallery.inputs.searchCustomers')"
      :back-label="t('shell.back')"
      :clear-label="t('gallery.inputs.clear')"
    >
      <template #trailing>
        <M3IconButton :label="t('gallery.inputs.voice')"><i-ms-mic-outline-rounded /></M3IconButton>
      </template>
      <template #default="{ query: term }">
        <M3List variant="standard" :label="t('gallery.inputs.searchCustomers')">
          <template v-if="term">
            <M3ListItem
              v-for="customer in matches(term)"
              :key="customer"
              clickable
              :headline="customer"
              @click="customerQuery = customer"
            >
              <template #leading><i-ms-person-outline-rounded /></template>
            </M3ListItem>
            <M3ListItem
              v-if="matches(term).length === 0"
              :headline="t('gallery.inputs.noMatches')"
            />
          </template>
          <template v-else>
            <M3ListItem
              v-for="recent in RECENT"
              :key="recent"
              clickable
              :headline="recent"
              @click="customerQuery = recent"
            >
              <template #leading><i-ms-history-rounded /></template>
            </M3ListItem>
          </template>
        </M3List>
      </template>
    </M3SearchView>
  </GalleryBlock>

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

  <GalleryBlock
    :title="t('gallery.inputs.dropdown')"
    :note="t('gallery.inputs.dropdownNote')"
    stack
  >
    <M3ExposedDropdown
      v-model="status"
      :label="t('gallery.inputs.status')"
      :options="statusOptions"
    />
    <M3ExposedDropdown
      v-model="wilaya"
      editable
      variant="outlined"
      :label="t('gallery.inputs.wilaya')"
      :supporting="t('gallery.inputs.wilayaHint')"
      :options="WILAYA_OPTIONS"
      :no-results-text="t('gallery.inputs.noMatches')"
      :results-text="resultsText"
    >
      <template #leading><i-ms-location-on-outline-rounded /></template>
    </M3ExposedDropdown>
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

  <GalleryBlock
    :title="t('gallery.inputs.richText')"
    :note="t('gallery.inputs.richTextNote')"
    stack
  >
    <M3TextEditor
      v-model="report"
      :label="t('gallery.inputs.report')"
      :placeholder="t('gallery.inputs.reportPlaceholder')"
      :labels="editorLabels"
      :link-label="t('gallery.inputs.linkAddress')"
      :apply-label="t('gallery.inputs.apply')"
      :remove-link-label="t('gallery.inputs.removeLink')"
      :invalid-link-text="t('gallery.inputs.invalidLink')"
    />
    <p class="type-body-small m-0 text-on-surface-variant">
      {{ t("gallery.inputs.stored", { n: report.length }) }}
    </p>
  </GalleryBlock>

  <GalleryProofOfDelivery />
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import GalleryProofOfDelivery from "@/modules/gallery/components/GalleryProofOfDelivery.vue";
import InputsAccount from "@/modules/gallery/components/inputs/InputsAccount.vue";
import InputsTags from "@/modules/gallery/components/inputs/InputsTags.vue";
import InputsVerification from "@/modules/gallery/components/inputs/InputsVerification.vue";
import { WILAYA_OPTIONS } from "@/modules/gallery/composables/wilayas";

const { t } = useI18n();
const report = ref(
  "<p>Visited <b>Supérette El Feth</b>: the shelf was restocked.</p><ul><li>Orange 1L - 12 cases</li><li>Apple 1L - 6 cases</li></ul>",
);
const editorLabels = computed(() => ({
  bold: t("gallery.inputs.commands.bold"),
  italic: t("gallery.inputs.commands.italic"),
  underline: t("gallery.inputs.commands.underline"),
  strikeThrough: t("gallery.inputs.commands.strikeThrough"),
  insertUnorderedList: t("gallery.inputs.commands.bulleted"),
  insertOrderedList: t("gallery.inputs.commands.numbered"),
  link: t("gallery.inputs.commands.link"),
  removeFormat: t("gallery.inputs.commands.clear"),
}));
const query = ref("");
const customerQuery = ref("");
const CUSTOMERS = [
  "Alger Distribution",
  "Annaba Market",
  "Béjaïa Foods",
  "Blida Wholesale",
  "Constantine Retail",
  "Oran Hypermarché",
  "Sétif Grocers",
  "Tlemcen Pharma",
];
const RECENT = ["Oran", "Constantine Retail", "Blida"];
const matches = (term: string) => {
  const needle = term.trim().toLocaleLowerCase();
  return CUSTOMERS.filter((customer) => customer.toLocaleLowerCase().includes(needle));
};
const STATUSES = ["draft", "confirmed", "delivered", "cancelled"] as const;
const status = ref<(typeof STATUSES)[number] | null>("confirmed");
const wilaya = ref<number | null>(31);
const statusOptions = computed(() =>
  STATUSES.map((value) => ({
    value,
    label: t(`gallery.inputs.statuses.${value}`),
    disabled: value === "cancelled",
  })),
);
const resultsText = (count: number) => t("gallery.inputs.results", { count }, count);
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
