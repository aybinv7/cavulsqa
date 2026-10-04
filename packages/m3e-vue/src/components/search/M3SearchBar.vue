<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { useTemplateRef } from "vue";

/**
 * The M3 search bar: a 56dp pill on `surface-container-high` with a leading slot (a search icon or
 * a back button), the query input and a trailing slot (an avatar, a mic). Typing emits through
 * `v-model`; Enter emits `search`. Clearing restores focus to the input.
 *
 * @see https://m3.material.io/components/search/specs
 */
const props = withDefaults(
  defineProps<{ placeholder: string; clearLabel?: string; autofocus?: boolean }>(),
  {
    clearLabel: "Clear",
    autofocus: false,
  },
);

const query = defineModel<string>({ default: "" });
const emit = defineEmits<{ search: [query: string] }>();
const input = useTemplateRef<HTMLInputElement>("input");

function clear() {
  query.value = "";
  input.value?.focus();
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <form class="m3-search-bar" role="search" @submit.prevent="emit('search', query)">
    <span class="m3-search-bar__leading">
      <slot name="leading">
        <M3Glyph name="search" />
      </slot>
    </span>
    <input
      ref="input"
      v-model="query"
      class="m3-search-bar__input"
      type="search"
      enterkeyhint="search"
      :placeholder="props.placeholder"
      :aria-label="props.placeholder"
      :autofocus="props.autofocus"
    />
    <button
      v-if="query"
      type="button"
      class="m3-search-bar__clear m3-state"
      :aria-label="props.clearLabel"
      @click="clear"
    >
      <M3Glyph name="close" />
    </button>
    <span v-if="$slots.trailing" class="m3-search-bar__trailing"><slot name="trailing" /></span>
  </form>
</template>

<style scoped>
.m3-search-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  height: 56px;
  margin: 0;
  padding: 0 4px;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}

.m3-search-bar:focus-within {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: -2px;
}

.m3-search-bar__leading,
.m3-search-bar__trailing {
  display: grid;
  flex: none;
  place-items: center;
  min-width: 48px;
  min-height: 48px;
}

.m3-search-bar__leading svg,
.m3-search-bar__clear svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-search-bar__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  caret-color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  appearance: none;
}

.m3-search-bar__input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
}

.m3-search-bar__input::-webkit-search-cancel-button {
  appearance: none;
}

.m3-search-bar__clear {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: none;
  color: inherit;
  cursor: pointer;
}
</style>
