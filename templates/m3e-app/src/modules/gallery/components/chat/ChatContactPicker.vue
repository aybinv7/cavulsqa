<template>
  <M3BottomSheet v-model:open="open" :title="t('gallery.chat.contact.title')" @closed="filter = ''">
    <div class="px-4 pb-2">
      <M3SearchBar
        v-model="filter"
        :placeholder="t('gallery.chat.contact.search')"
        :clear-label="t('gallery.inputs.clear')"
      />
    </div>
    <M3List variant="standard" :label="t('gallery.chat.contact.title')">
      <M3ListItem
        v-for="customer in matches"
        :key="customer.id"
        clickable
        :headline="customer.name"
        :supporting="customer.city"
        @click="pick(customer)"
      >
        <template #leading>
          <span
            class="type-title-medium grid size-10 place-items-center rounded-full bg-secondary-container text-on-secondary-container"
            aria-hidden="true"
          >
            {{ initial(customer.name) }}
          </span>
        </template>
      </M3ListItem>
    </M3List>
    <p
      v-if="!loading && matches.length === 0"
      class="type-body-medium m-0 px-6 py-8 text-center text-on-surface-variant"
      role="status"
    >
      {{ emptyText }}
    </p>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import type { MessageContact } from "@cavulsqa/m3e-vue";

interface Customer {
  id: number;
  name: string;
  city: string;
}

const props = defineProps<{
  customers: readonly Customer[];
  loading?: boolean;
  failed?: boolean;
}>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ pick: [contact: MessageContact] }>();
const { t, locale } = useI18n();

const filter = ref("");
const needle = computed(() => filter.value.trim().toLocaleLowerCase(locale.value));

const matches = computed(() =>
  needle.value
    ? props.customers.filter((customer) =>
        `${customer.name} ${customer.city}`.toLocaleLowerCase(locale.value).includes(needle.value),
      )
    : props.customers,
);

const emptyText = computed(() => {
  if (props.failed) return t("gallery.chat.contact.failed");
  return needle.value ? t("gallery.inputs.noMatches") : t("gallery.chat.contact.empty");
});

/** First and last word's first letter, so "Customer 2" and "Customer 8" do not share a monogram. */
function initial(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = [...(words[0] ?? "")][0] ?? "";
  const last = words.length > 1 ? ([...(words.at(-1) ?? "")][0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase(locale.value);
}

function pick(customer: Customer) {
  emit("pick", { name: customer.name, detail: customer.city });
  open.value = false;
}
</script>
