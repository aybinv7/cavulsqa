<script setup lang="ts">
import { computed } from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useTabs } from "./context.js";

/** One tab. With an `icon` slot, primary tabs stack the icon over the label at 72dp. */
const props = defineProps<{ value: string; label: string; disabled?: boolean }>();

const tabs = useTabs();
const selected = computed(() => tabs.selected.value === props.value);
</script>

<template>
  <button
    v-ripple="!props.disabled"
    type="button"
    role="tab"
    class="m3-tab m3-state"
    :class="[
      `m3-tab--${tabs.variant.value}`,
      { 'm3-tab--selected': selected, 'm3-tab--icon': $slots.icon },
    ]"
    :data-value="props.value"
    :aria-selected="selected"
    :tabindex="selected ? 0 : -1"
    :disabled="props.disabled"
    @click="tabs.select(props.value)"
  >
    <span class="m3-tab__content" data-tab-content>
      <span v-if="$slots.icon" class="m3-tab__icon" aria-hidden="true"
        ><slot name="icon" :selected="selected"
      /></span>
      <span class="m3-tab__label">{{ props.label }}</span>
    </span>
  </button>
</template>

<style scoped>
.m3-tab {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 48px;
  margin: 0;
  padding: 0 16px;
  border: 0;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
  letter-spacing: var(--md-sys-typescale-title-small-tracking);
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-tab:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
}

.m3-tab--primary.m3-tab--selected {
  color: var(--md-sys-color-primary);
}

.m3-tab--secondary.m3-tab--selected {
  color: var(--md-sys-color-on-surface);
}

.m3-tab--primary.m3-tab--icon {
  height: 72px;
}

.m3-tab__content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.m3-tab__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.m3-tab--primary.m3-tab--icon .m3-tab__content {
  flex-direction: column;
  gap: 2px;
}

.m3-tab__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 24px;
}

.m3-tab__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.m3-tab:disabled {
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  cursor: default;
}
</style>
