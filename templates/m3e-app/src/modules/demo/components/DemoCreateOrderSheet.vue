<template>
  <M3BottomSheet v-model:open="open" :title="t('demo.newOrder')" @opened="focusReference">
    <div class="flex flex-col gap-2 px-4">
      <M3TextField
        ref="referenceField"
        v-model="reference"
        :label="t('demo.reference')"
        autocomplete="off"
      />
      <M3List variant="segmented">
        <M3ListItem
          clickable
          :overline="t('demo.customer')"
          :headline="customerLabel"
          @click="chooseCustomer"
        >
          <template #leading><i-ms-person-outline-rounded /></template>
          <template #trailing><i-ms-chevron-right-rounded class="rtl:-scale-x-100" /></template>
        </M3ListItem>
      </M3List>
    </div>

    <SectionHeader :title="t('demo.products')" />
    <M3List variant="segmented" inset :label="t('demo.products')">
      <M3ListItem
        v-for="product in products"
        :key="product.id"
        :headline="product.name"
        :supporting="formatMoney(product.price_cents)"
        :selected="quantityOf(product.id) > 0"
      >
        <template #action>
          <div class="flex items-center gap-1">
            <M3IconButton
              :label="t('demo.less', { product: product.name })"
              variant="tonal"
              size="xs"
              :disabled="quantityOf(product.id) === 0"
              @click="step(product.id, -1)"
            >
              <i-ms-remove-rounded />
            </M3IconButton>
            <span
              class="type-title-small-emphasized w-7 text-center tabular-nums"
              aria-live="polite"
            >
              {{ quantityOf(product.id) }}
            </span>
            <M3IconButton
              :label="t('demo.more', { product: product.name })"
              variant="tonal"
              size="xs"
              @click="step(product.id, 1)"
            >
              <i-ms-add-rounded />
            </M3IconButton>
          </div>
        </template>
      </M3ListItem>
    </M3List>

    <template #footer>
      <div class="flex items-center gap-4">
        <div class="flex flex-1 flex-col">
          <span class="type-label-medium text-on-surface-variant">{{ t("demo.total") }}</span>
          <span class="type-title-large-emphasized tabular-nums">{{
            formatMoney(totalCents)
          }}</span>
        </div>
        <M3Button size="m" :disabled="!canSave || saving" @click="save">{{
          t("demo.save")
        }}</M3Button>
      </div>
    </template>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import {
  listCustomers,
  listProducts,
  nextOrderReference,
  type DraftLine,
  type ProductRow,
} from "@/domains/sales/sales.repository";
import { formatMoney } from "@/modules/demo/composables/useOrderStatus";
import { getDatabase } from "@/shared/database/database";

/**
 * The new-order form in a bottom sheet. Saving is handed in as an async prop rather than emitted, so
 * the sheet stays open and says so when the write fails instead of closing on a lost order.
 */
const open = defineModel<boolean>("open", { default: false });
const props = defineProps<{
  save: (draft: { customerId: number; reference: string; lines: DraftLine[] }) => Promise<void>;
}>();
const { t } = useI18n();
const actionSheet = useActionSheet();
const snackbar = useSnackbar();

const customers = ref<Array<{ id: number; name: string; city: string }>>([]);
const products = ref<ProductRow[]>([]);
const quantities = ref<Record<number, number>>({});
const reference = ref("");
const customerId = ref(0);
const saving = ref(false);
const referenceField = useTemplateRef<ComponentPublicInstance>("referenceField");

const customerLabel = computed(() => {
  const customer = customers.value.find((entry) => entry.id === customerId.value);
  return customer ? `${customer.name} — ${customer.city}` : t("demo.chooseCustomer");
});

/** Loaded each time the sheet opens rather than on mount, so the reference follows the latest order. */
async function load() {
  try {
    const db = getDatabase().db;
    const [loadedCustomers, loadedProducts, nextReference] = await Promise.all([
      listCustomers(db),
      listProducts(db),
      nextOrderReference(db),
    ]);
    customers.value = loadedCustomers;
    products.value = loadedProducts;
    reference.value = nextReference;
    customerId.value = loadedCustomers[0]?.id ?? 0;
    quantities.value = {};
  } catch (error) {
    console.error("[demo] could not load the order form", error);
    void snackbar.show({ message: t("demo.loadFailed"), duration: "long" });
  }
}

watch(open, (isOpen) => {
  if (isOpen) void load();
});

function focusReference() {
  (referenceField.value?.$el as HTMLElement | undefined)
    ?.querySelector("input")
    ?.focus({ preventScroll: true });
}

const quantityOf = (productId: number) => quantities.value[productId] ?? 0;

function step(productId: number, delta: number) {
  const next = Math.min(99, Math.max(0, quantityOf(productId) + delta));
  quantities.value = { ...quantities.value, [productId]: next };
}

async function chooseCustomer() {
  const choice = await actionSheet.open({
    title: t("demo.customer"),
    groups: [
      {
        items: customers.value.map((customer) => ({
          id: String(customer.id),
          label: customer.name,
          supporting: customer.city,
          selected: customer.id === customerId.value,
        })),
      },
    ],
  });
  if (choice) customerId.value = Number(choice);
}

const lines = computed(() =>
  products.value
    .filter((product) => quantityOf(product.id) > 0)
    .map((product) => ({
      productId: product.id,
      quantity: quantityOf(product.id),
      unitPriceCents: product.price_cents,
    })),
);

const totalCents = computed(() =>
  lines.value.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
);
const canSave = computed(
  () => customerId.value > 0 && lines.value.length > 0 && reference.value.trim() !== "",
);

async function save() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    await props.save({
      customerId: customerId.value,
      reference: reference.value.trim(),
      lines: lines.value,
    });
    open.value = false;
  } catch (error) {
    console.error("[demo] saving the order failed", error);
    void snackbar.show({ message: t("demo.saveFailed"), duration: "long" });
  } finally {
    saving.value = false;
  }
}
</script>
