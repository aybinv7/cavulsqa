<template>
  <M3List variant="segmented" inset :label="t('demo.orders')">
    <M3ListItem
      v-for="order in orders"
      :key="order.id"
      v-model:swiped="swiped[order.id]"
      clickable
      swipe-full="end"
      :headline="order.reference"
      :supporting="`${order.customerName} · ${t('demo.lines', { count: order.lines }, order.lines)}`"
      @click="emit('open', order, $event)"
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
      <template #swipe-end>
        <M3SwipeAction
          v-if="nextStep(order)"
          tone="primary"
          :label="nextStep(order) === 'confirm' ? t('demo.confirm') : t('demo.deliver')"
          @click="emit('advance', order)"
        >
          <i-ms-local-shipping-outline-rounded v-if="nextStep(order) === 'confirm'" />
          <i-ms-verified-outline-rounded v-else />
        </M3SwipeAction>
        <M3SwipeAction tone="error" :label="t('demo.delete')" @click="emit('delete', order)">
          <i-ms-delete-outline-rounded />
        </M3SwipeAction>
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
 * Tapping a row opens the order. Swiping it toward the start reveals its next step and Delete - a
 * long swipe deletes - and the trailing button offers the same actions in a sheet, for anyone who
 * never discovers the gesture.
 */
defineProps<{ orders: OrderRow[] }>();
const emit = defineEmits<{
  open: [order: OrderRow, event: MouseEvent];
  more: [order: OrderRow];
  advance: [order: OrderRow];
  delete: [order: OrderRow];
}>();
const { t } = useI18n();
const swiped = reactive<Record<number, "start" | "end" | null>>({});

const nextStep = (order: OrderRow) =>
  order.status === "draft" ? "confirm" : order.status === "confirmed" ? "deliver" : null;
</script>
