<template>
  <M3List variant="segmented" inset :label="t('demo.orders')">
    <M3ListItem
      v-for="order in orders"
      :key="order.id"
      clickable
      :headline="order.reference"
      :supporting="`${order.customerName} · ${t('demo.lines', { count: order.lines }, order.lines)}`"
      @click="emit('open', order)"
    >
      <template #leading>
        <M3Shape
          :shape="statusLook(order.status).shape"
          class="size-10"
          :class="statusLook(order.status).classes"
        >
          <component :is="statusLook(order.status).icon" class="size-5" />
        </M3Shape>
      </template>
      <template #trailing>
        <span class="type-title-small-emphasized tabular-nums text-on-surface">{{
          formatMoney(order.totalCents)
        }}</span>
      </template>
      <template #action>
        <M3IconButton
          :label="t('demo.actionsFor', { reference: order.reference })"
          size="s"
          @click="emit('more', order)"
        >
          <i-ms-more-vert-rounded />
        </M3IconButton>
      </template>
    </M3ListItem>
  </M3List>
</template>

<script setup lang="ts">
import type { OrderRow } from "@/domains/sales/sales.repository";
import { formatMoney, statusLook } from "@/modules/demo/composables/useOrderStatus";

/**
 * Tapping a row opens the order; the trailing button opens its quick actions in a sheet - the
 * Material answer to swipe actions, reachable without a gesture nobody discovers.
 */
defineProps<{ orders: OrderRow[] }>();
const emit = defineEmits<{ open: [order: OrderRow]; more: [order: OrderRow] }>();
const { t } = useI18n();
</script>
