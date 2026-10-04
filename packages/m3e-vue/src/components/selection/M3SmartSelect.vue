<script setup lang="ts" generic="V">
import M3BottomSheet from "../sheet/M3BottomSheet.vue";
import M3Button from "../button/M3Button.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import M3ListItem from "../list/M3ListItem.vue";
import M3SearchBar from "../search/M3SearchBar.vue";
import { computed, nextTick, shallowRef, useId, watch } from "vue";
import { filterOptions, type DropdownOption } from "../../utils/dropdown.js";

/**
 * Framework7's smart select: a list row naming the choice, which opens a sheet of the options -
 * radio marks for one, check marks for several. One choice closes the sheet; several are toggled
 * and confirmed with `doneLabel`. Past `searchFrom` options a search field filters them, ignoring
 * case and accents. The options are a listbox: arrow keys move, Space or Enter picks.
 *
 * `v-model` is the value, or an array of values with `multiple`. Place the row in an `M3List`.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    label: string;
    options: readonly DropdownOption<V>[];
    multiple?: boolean;
    placeholder?: string;
    searchFrom?: number;
    searchPlaceholder?: string;
    doneLabel?: string;
    noResultsText?: string;
    disabled?: boolean;
  }>(),
  {
    multiple: false,
    placeholder: "",
    searchFrom: 10,
    searchPlaceholder: "Search",
    doneLabel: "Done",
    noResultsText: "No results",
    disabled: false,
  },
);

const model = defineModel<V | V[] | null>({ default: null });
const open = shallowRef(false);
const query = shallowRef("");
const listId = useId();

const chosen = computed<V[]>(() => {
  const value = model.value;
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value as V];
});
const isChosen = (value: V) => chosen.value.includes(value);

const summary = computed(() => {
  const labels = props.options.filter((option) => isChosen(option.value)).map((o) => o.label);
  return labels.length > 0 ? labels.join(", ") : props.placeholder;
});

const searchable = computed(() => props.options.length >= props.searchFrom);
const shown = computed(() =>
  searchable.value && query.value.trim()
    ? filterOptions(props.options, query.value, props.options.length)
    : props.options,
);

function toggle(option: DropdownOption<V>) {
  if (option.disabled) return;
  if (!props.multiple) {
    model.value = option.value;
    open.value = false;
    return;
  }
  const next = isChosen(option.value)
    ? chosen.value.filter((value) => value !== option.value)
    : [...chosen.value, option.value];
  const order = (value: V) => props.options.findIndex((candidate) => candidate.value === value);
  model.value = next.sort((a, b) => order(a) - order(b));
}

function rows(): HTMLElement[] {
  return [
    ...(document.getElementById(listId)?.querySelectorAll<HTMLElement>("[role=option]") ?? []),
  ];
}

function onKeydown(event: KeyboardEvent) {
  const list = rows();
  const index = list.indexOf(document.activeElement as HTMLElement);
  const moves: Record<string, number> = {
    ArrowDown: index + 1,
    ArrowUp: index - 1,
    Home: 0,
    End: list.length - 1,
  };
  if (event.key in moves) {
    event.preventDefault();
    list[Math.min(list.length - 1, Math.max(0, moves[event.key]!))]?.focus();
  }
}

watch(open, async (value) => {
  if (!value) return;
  query.value = "";
  await nextTick();
  const first = rows().find((row) => row.getAttribute("aria-selected") === "true") ?? rows()[0];
  if (!searchable.value) first?.focus({ preventScroll: true });
  first?.scrollIntoView({ block: "nearest" });
});
</script>

<template>
  <M3ListItem
    v-bind="$attrs"
    clickable
    :headline="props.label"
    :supporting="summary"
    :disabled="props.disabled"
    @click="open = true"
  >
    <template v-if="$slots.leading" #leading><slot name="leading" /></template>
    <template #trailing><M3Glyph name="chevronRight" class="m3-smart-select__chevron" /></template>
  </M3ListItem>

  <M3BottomSheet v-model:open="open" :title="props.label" :content-drag="false">
    <template v-if="searchable" #header>
      <div class="m3-smart-select__header">
        <h2 class="m3-smart-select__title">{{ props.label }}</h2>
        <M3SearchBar v-model="query" :placeholder="props.searchPlaceholder" />
      </div>
    </template>
    <div
      :id="listId"
      class="m3-smart-select__list"
      role="listbox"
      :aria-label="props.label"
      :aria-multiselectable="props.multiple || undefined"
      @keydown="onKeydown"
    >
      <div
        v-for="(option, index) in shown"
        :key="index"
        class="m3-smart-select__option m3-state"
        :class="{ 'm3-smart-select__option--chosen': isChosen(option.value) }"
        role="option"
        :aria-selected="isChosen(option.value)"
        :aria-disabled="option.disabled || undefined"
        tabindex="-1"
        @click="toggle(option)"
        @keydown.enter.prevent="toggle(option)"
        @keydown.space.prevent="toggle(option)"
      >
        <span
          class="m3-smart-select__mark"
          :class="props.multiple ? 'm3-smart-select__mark--box' : 'm3-smart-select__mark--dot'"
          aria-hidden="true"
        >
          <M3Glyph v-if="props.multiple && isChosen(option.value)" name="check" />
        </span>
        <span class="m3-smart-select__text">
          <span class="m3-smart-select__label">{{ option.label }}</span>
          <span v-if="option.supporting" class="m3-smart-select__supporting">{{
            option.supporting
          }}</span>
        </span>
      </div>
      <p v-if="shown.length === 0" class="m3-smart-select__empty">{{ props.noResultsText }}</p>
    </div>
    <template v-if="props.multiple" #footer>
      <M3Button class="m3-smart-select__done" size="m" @click="open = false">{{
        props.doneLabel
      }}</M3Button>
    </template>
  </M3BottomSheet>
</template>

<style scoped>
.m3-smart-select__done {
  width: 100%;
}

.m3-smart-select__chevron {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

:global([dir="rtl"] .m3-smart-select__chevron) {
  transform: scaleX(-1);
}

.m3-smart-select__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m3-smart-select__title {
  margin: 0;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
}

.m3-smart-select__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 16px;
}

.m3-smart-select__option {
  display: flex;
  align-items: center;
  gap: 16px;
  box-sizing: border-box;
  min-height: 56px;
  padding: 8px 16px;
  border-radius: 4px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-smart-select__option:first-child {
  border-start-start-radius: 16px;
  border-start-end-radius: 16px;
}

.m3-smart-select__option:last-of-type {
  border-end-start-radius: 16px;
  border-end-end-radius: 16px;
}

.m3-smart-select__option:focus-visible {
  outline: 3px solid var(--md-sys-color-secondary);
  outline-offset: -3px;
}

.m3-smart-select__option--chosen {
  border-radius: 16px;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-smart-select__option[aria-disabled="true"] {
  opacity: 0.38;
  cursor: default;
}

.m3-smart-select__mark {
  display: grid;
  flex: none;
  place-items: center;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  border: 2px solid var(--md-sys-color-on-surface-variant);
  color: var(--md-sys-color-on-primary);
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    border-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-smart-select__mark--box {
  border-radius: 2px;
}

.m3-smart-select__mark--dot {
  border-radius: 50%;
}

.m3-smart-select__option--chosen .m3-smart-select__mark--box {
  border-color: var(--md-sys-color-primary);
  background: var(--md-sys-color-primary);
}

.m3-smart-select__option--chosen .m3-smart-select__mark--dot {
  border-color: var(--md-sys-color-primary);
  box-shadow:
    inset 0 0 0 3px var(--md-sys-color-secondary-container),
    inset 0 0 0 8px var(--md-sys-color-primary);
}

.m3-smart-select__mark :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.m3-smart-select__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.m3-smart-select__label {
  overflow: hidden;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-smart-select__supporting {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-smart-select__option--chosen .m3-smart-select__supporting {
  color: inherit;
}

.m3-smart-select__empty {
  margin: 0;
  padding: 16px;
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
}
</style>
