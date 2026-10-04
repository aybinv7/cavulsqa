<script setup lang="ts">
/**
 * A 1dp `outline-variant` divider, full width or inset from either side by 16dp.
 *
 * @see https://m3.material.io/components/divider/specs
 */
const props = withDefaults(
  defineProps<{ inset?: "none" | "start" | "end" | "both"; vertical?: boolean }>(),
  {
    inset: "none",
    vertical: false,
  },
);
</script>

<template>
  <hr
    class="m3-divider"
    :class="[`m3-divider--${props.inset}`, { 'm3-divider--vertical': props.vertical }]"
    :aria-orientation="props.vertical ? 'vertical' : undefined"
  />
</template>

<style scoped>
.m3-divider {
  flex: none;
  height: 1px;
  margin: 0;
  border: 0;
  background: var(--md-sys-color-outline-variant);
}

.m3-divider--start,
.m3-divider--both {
  margin-inline-start: 16px;
}

.m3-divider--end,
.m3-divider--both {
  margin-inline-end: 16px;
}

.m3-divider--vertical {
  width: 1px;
  height: auto;
  align-self: stretch;
  margin-inline: 0;
}
</style>
