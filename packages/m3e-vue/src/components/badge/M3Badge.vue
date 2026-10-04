<script setup lang="ts">
import { computed } from "vue";

/**
 * A badge: a 6dp dot without `count`, or a 16dp pill with the number (capped at `max`, shown as
 * "999+"). Wrap the element it marks; the badge sits on its top-end corner.
 *
 * @see https://m3.material.io/components/badges/specs
 */
const props = withDefaults(
  defineProps<{ count?: number; max?: number; label?: string; hidden?: boolean }>(),
  {
    max: 999,
    hidden: false,
  },
);

const text = computed(() => {
  if (props.count === undefined) return "";
  return props.count > props.max ? `${props.max}+` : String(props.count);
});
</script>

<template>
  <span class="m3-badge-anchor">
    <slot />
    <span
      v-if="!props.hidden && (props.count === undefined || props.count > 0)"
      class="m3-badge"
      :class="{ 'm3-badge--dot': props.count === undefined }"
      :aria-label="props.label"
      :role="props.label ? 'status' : undefined"
    >
      {{ text }}
    </span>
  </span>
</template>

<style scoped>
.m3-badge-anchor {
  position: relative;
  display: inline-flex;
}

.m3-badge {
  position: absolute;
  top: -4px;
  inset-inline-start: calc(100% - 12px);
  display: grid;
  place-items: center;
  box-sizing: border-box;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) / 16px
    var(--md-sys-typescale-label-small-font);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.m3-badge--dot {
  top: 0;
  inset-inline-start: calc(100% - 6px);
  min-width: 6px;
  height: 6px;
  padding: 0;
  border-radius: 3px;
}
</style>
