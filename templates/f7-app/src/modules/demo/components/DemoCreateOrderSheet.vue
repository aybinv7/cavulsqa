<template>
  <F7Sheet
    class="demo-create-sheet"
    :opened="opened"
    swipe-to-close
    backdrop
    @sheet:closed="$emit('close')"
    @sheet:open="load"
  >
    <F7Toolbar>
      <div class="left px-3 font-medium">{{ t("demo.newOrder") }}</div>
      <div class="right">
        <F7Link sheet-close>{{ t("demo.cancel") }}</F7Link>
      </div>
    </F7Toolbar>

    <F7PageContent class="pb-6!">
      <F7List strong inset dividers class="rounded-2xl! mt-3!">
        <F7ListInput
          :label="t('demo.reference')"
          type="text"
          :value="reference"
          @input="reference = ($event.target as HTMLInputElement).value"
        />
        <F7ListItem
          :title="t('demo.customer')"
          smart-select
          :smart-select-params="{ openIn: 'sheet', closeOnSelect: true }"
        >
          <select :value="String(customerId)" @change="onCustomer">
            <option v-for="customer in customers" :key="customer.id" :value="String(customer.id)">
              {{ customer.name }} — {{ customer.city }}
            </option>
          </select>
        </F7ListItem>
      </F7List>

      <F7BlockTitle>{{ t("demo.products") }}</F7BlockTitle>
      <F7List strong inset dividers class="rounded-2xl!">
        <F7ListItem v-for="product in products" :key="product.id" :title="product.name">
          <template #footer>{{ money(product.price_cents) }}</template>
          <template #after>
            <F7Stepper
              small
              raised
              :value="quantityOf(product.id)"
              :min="0"
              :max="99"
              @stepper:change="(value: number) => setQuantity(product.id, value)"
            />
          </template>
        </F7ListItem>
      </F7List>

      <F7Block class="flex items-center justify-between">
        <span class="text-sm opacity-60">{{ t("demo.total") }}</span>
        <span class="text-lg font-semibold tabular-nums">{{ money(totalCents) }}</span>
      </F7Block>

      <F7Block>
        <F7Button large fill :disabled="!canSave" @click="save">{{ t("demo.save") }}</F7Button>
      </F7Block>
    </F7PageContent>
  </F7Sheet>
</template>

<script setup lang="ts">
import {
  listCustomers,
  listProducts,
  nextOrderReference,
  type ProductRow,
} from "@/domains/sales/sales.repository";
import { getDatabase } from "@/shared/database/database";

const props = defineProps<{ opened: boolean }>();
const emit = defineEmits<{
  close: [];
  save: [
    payload: {
      customerId: number;
      reference: string;
      lines: Array<{ productId: number; quantity: number; unitPriceCents: number }>;
    },
  ];
}>();

const { t } = useI18n();

const customers = ref<Array<{ id: number; name: string; city: string }>>([]);
const products = ref<ProductRow[]>([]);
const quantities = ref<Record<number, number>>({});
const reference = ref("");
const customerId = ref(0);

const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const money = (cents: number) => formatter.format(cents / 100);

/** Loaded when the sheet opens rather than on mount, so the reference reflects the latest order. */
async function load() {
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
}

watch(
  () => props.opened,
  (isOpen) => {
    if (isOpen) void load();
  },
);

const quantityOf = (productId: number) => quantities.value[productId] ?? 0;

function setQuantity(productId: number, value: number) {
  quantities.value = { ...quantities.value, [productId]: value };
}

function onCustomer(event: Event) {
  customerId.value = Number((event.target as HTMLSelectElement).value);
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

const canSave = computed(() => customerId.value > 0 && lines.value.length > 0);

function save() {
  if (!canSave.value) return;
  emit("save", { customerId: customerId.value, reference: reference.value, lines: lines.value });
}
</script>

<style scoped>
.demo-create-sheet {
  height: auto;
  max-height: 85vh;
  overflow: auto;
}
</style>
