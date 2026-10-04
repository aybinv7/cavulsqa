<template>
  <AppPage :title="t('gallery.contacts.title')" back variant="small">
    <div class="pe-6">
      <M3ListGroup v-for="group in groups" :key="group.key" :title="group.key">
        <M3ListItem
          v-for="customer in group.customers"
          :key="customer.name"
          clickable
          :headline="customer.name"
          :supporting="customer.city"
        >
          <template #leading>
            <span
              class="type-title-medium grid size-10 place-items-center rounded-full bg-secondary-container text-on-secondary-container"
              >{{ customer.name.charAt(0) }}</span
            >
          </template>
        </M3ListItem>
      </M3ListGroup>
    </div>

    <template #fixed>
      <M3ListIndex :keys="keys" :label="t('gallery.contacts.jump')" />
    </template>
  </AppPage>
</template>

<script setup lang="ts">
import { groupKey } from "@cavulsqa/m3e-vue";
import { WILAYAS } from "@/modules/gallery/composables/wilayas";

const NAMES = [
  "Amine",
  "Bachir",
  "Chérif",
  "Djamel",
  "Elias",
  "Farid",
  "Ghani",
  "Hakim",
  "Idir",
  "Jamel",
  "Karim",
  "Lotfi",
  "Mourad",
  "Nabil",
  "Omar",
  "Rachid",
  "Samir",
  "Tarek",
  "Walid",
  "Yacine",
  "Zinedine",
];
const TRADES = ["Alimentation", "Supérette"];

const { t } = useI18n();

const customers = NAMES.flatMap((name, index) =>
  TRADES.map((trade, offset) => ({
    name: `${name} ${trade}`,
    city: WILAYAS[(index * 7 + offset * 13) % WILAYAS.length]!,
  })),
).sort((a, b) => a.name.localeCompare(b.name, "fr"));

const groups = [
  ...customers
    .reduce((byKey, customer) => {
      const key = groupKey(customer.name);
      byKey.set(key, [...(byKey.get(key) ?? []), customer]);
      return byKey;
    }, new Map<string, typeof customers>())
    .entries(),
].map(([key, members]) => ({ key, customers: members }));

const keys = groups.map((group) => group.key);
</script>
