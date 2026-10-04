<script setup lang="ts" generic="V">
import M3Glyph from "../icon/M3Glyph.vue";
import M3LinearProgress from "../progress/M3LinearProgress.vue";
import M3TextField from "./M3TextField.vue";
import { computed, nextTick, onScopeDispose, shallowRef, useId, useTemplateRef, watch } from "vue";
import { useOverlay } from "../../composables/useOverlay.js";
import {
  filterOptions,
  highlightParts,
  nextEnabled,
  typeahead,
  type DropdownOption,
} from "../../utils/dropdown.js";

/**
 * Compose's exposed dropdown menu: a text field whose options drop down beneath it, as wide as the
 * field. Read-only it is a select - tap or the arrow keys open it, typing a letter jumps to the
 * option it starts. `editable` makes it Framework7's autocomplete: typing filters the options
 * (ignoring case and accents, matches at the start first), the match is bolded, and leaving the
 * field without choosing puts the chosen label back.
 *
 * Focus never leaves the field: it is a combobox whose active option is announced through
 * `aria-activedescendant`, so the keyboard stays up while the arrows move through the list. The
 * list opens above the field when the keyboard leaves no room below. For a remote source, set
 * `:filter="false"`, watch `v-model:query` and pass the results as `options`, with `loading`
 * while they are on their way.
 *
 * @see https://m3.material.io/components/menus/guidelines
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    label: string;
    options: readonly DropdownOption<V>[];
    editable?: boolean;
    variant?: "filled" | "outlined";
    supporting?: string;
    error?: string;
    disabled?: boolean;
    filter?: boolean;
    limit?: number;
    loading?: boolean;
    noResultsText?: string;
    resultsText?: (count: number) => string;
    teleport?: string | HTMLElement;
  }>(),
  {
    editable: false,
    variant: "filled",
    disabled: false,
    filter: true,
    limit: 50,
    loading: false,
    noResultsText: "No results",
    resultsText: (count: number) => `${count} results`,
    teleport: "body",
  },
);

const value = defineModel<V | null>({ default: null });
const query = defineModel<string>("query", { default: "" });

const field = useTemplateRef<HTMLElement>("field");
const panel = useTemplateRef<HTMLElement>("panel");
const open = shallowRef(false);
const active = shallowRef(-1);
const typed = shallowRef(false);
const position = shallowRef({ top: 0, left: 0, width: 0, maxHeight: 280, origin: "top" });
const id = useId();
const listId = `${id}-list`;
const optionId = (index: number) => `${id}-option-${index}`;
const GAP = 4;
const MARGIN = 8;
let typeBuffer = "";
let typeTimer: ReturnType<typeof setTimeout> | undefined;

const selected = computed(() => props.options.find((option) => option.value === value.value));
const shown = computed(() => {
  if (props.editable && props.filter && typed.value) {
    return filterOptions(props.options, query.value, props.limit);
  }
  return props.options.slice(0, props.limit);
});
const rows = computed(() =>
  shown.value.map((option) => ({
    option,
    parts: props.editable && typed.value ? highlightParts(option.label, query.value) : null,
  })),
);
const display = computed(() => (props.editable ? query.value : (selected.value?.label ?? "")));

watch(
  selected,
  (option) => {
    if (props.editable && !open.value) query.value = option?.label ?? "";
  },
  { immediate: true },
);

useOverlay({ open, dismissible: true, onClose: () => close() });

function anchor(): HTMLElement | null {
  return field.value?.querySelector<HTMLElement>(".m3-text-field__container") ?? null;
}

function place() {
  const target = anchor();
  const list = panel.value;
  if (!target || !list) return;
  const rect = target.getBoundingClientRect();
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const bottom = top + (viewport?.height ?? window.innerHeight);
  const below = bottom - rect.bottom - GAP - MARGIN;
  const above = rect.top - top - GAP - MARGIN;
  const height = list.scrollHeight;
  const downward = below >= Math.min(height, 200) || below >= above;
  const maxHeight = Math.max(96, Math.min(downward ? below : above, 320));
  position.value = {
    top: downward ? rect.bottom + GAP : rect.top - GAP - Math.min(height, maxHeight),
    left: rect.left,
    width: rect.width,
    maxHeight,
    origin: downward ? "top" : "bottom",
  };
}

function selectedIndex(): number {
  return shown.value.findIndex((option) => option.value === value.value);
}

async function show(start: "selected" | "first" | "last" = "selected", typing = false) {
  if (props.disabled) return;
  if (!open.value) {
    typed.value = typing;
    open.value = true;
  }
  const options = shown.value;
  const current = selectedIndex();
  active.value =
    start === "selected" && current >= 0
      ? current
      : start === "last"
        ? nextEnabled(options, 0, -1)
        : nextEnabled(options, -1, 1);
  await nextTick();
  place();
}

function close() {
  if (!open.value) return;
  open.value = false;
  active.value = -1;
  if (props.editable) {
    typed.value = false;
    query.value = selected.value?.label ?? "";
  }
}

function choose(index: number) {
  const option = shown.value[index];
  if (!option || option.disabled) return;
  value.value = option.value;
  typed.value = false;
  if (props.editable) query.value = option.label;
  open.value = false;
  active.value = -1;
}

function onInput(text: string) {
  if (!props.editable) return;
  query.value = text;
  typed.value = true;
  if (!open.value) void show("first", true);
  else {
    active.value = text.trim() ? nextEnabled(shown.value, -1, 1) : -1;
    void nextTick(place);
  }
}

function onFieldClick() {
  if (props.disabled) return;
  if (props.editable) void show();
  else if (open.value) close();
  else void show();
}

function move(direction: 1 | -1) {
  const options = shown.value;
  if (options.length === 0) return;
  active.value = nextEnabled(
    options,
    active.value < 0 && direction < 0 ? 0 : active.value,
    direction,
  );
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  const key = event.key;
  if (key === "ArrowDown" || key === "ArrowUp") {
    event.preventDefault();
    if (!open.value) void show(key === "ArrowDown" ? "selected" : "last");
    else move(key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (key === "Enter" || (key === " " && !props.editable)) {
    if (open.value && active.value >= 0) {
      event.preventDefault();
      choose(active.value);
    } else if (!props.editable) {
      event.preventDefault();
      void show();
    }
    return;
  }
  if (key === "Tab") {
    close();
    return;
  }
  if (!props.editable && open.value && (key === "Home" || key === "End")) {
    event.preventDefault();
    active.value =
      key === "Home" ? nextEnabled(shown.value, -1, 1) : nextEnabled(shown.value, 0, -1);
    return;
  }
  if (!props.editable && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    clearTimeout(typeTimer);
    typeBuffer += key;
    typeTimer = setTimeout(() => (typeBuffer = ""), 600);
    const from = active.value >= 0 ? active.value : selectedIndex();
    const match = typeahead(shown.value, typeBuffer, typeBuffer.length > 1 ? from - 1 : from);
    if (match < 0) return;
    if (open.value) active.value = match;
    else choose(match);
  }
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (field.value?.contains(target) || panel.value?.contains(target)) return;
  close();
}

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (next && (field.value?.contains(next) || panel.value?.contains(next))) return;
  close();
}

const listen = (on: boolean) => {
  if (on) {
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return;
  }
  document.removeEventListener("pointerdown", onPointerDown, true);
  window.removeEventListener("resize", place);
  window.visualViewport?.removeEventListener("resize", place);
  window.visualViewport?.removeEventListener("scroll", place);
};

watch(open, (value) => listen(value));

watch(active, async (index) => {
  if (index < 0 || !open.value) return;
  await nextTick();
  document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
});

onScopeDispose(() => {
  listen(false);
  clearTimeout(typeTimer);
});
</script>

<template>
  <div
    ref="field"
    v-bind="$attrs"
    class="m3-exposed-dropdown"
    :class="{ 'm3-exposed-dropdown--open': open, 'm3-exposed-dropdown--select': !props.editable }"
    @click="onFieldClick"
    @focusout="onFocusOut"
  >
    <M3TextField
      :model-value="display"
      :label="props.label"
      :variant="props.variant"
      :supporting="props.supporting"
      :error="props.error"
      :disabled="props.disabled"
      :readonly="!props.editable"
      role="combobox"
      autocomplete="off"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-autocomplete="props.editable ? 'list' : 'none'"
      :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
      @update:model-value="onInput"
      @keydown="onKeydown"
    >
      <template v-if="$slots.leading" #leading><slot name="leading" /></template>
      <template #trailing>
        <M3Glyph name="dropDown" class="m3-exposed-dropdown__arrow" />
      </template>
    </M3TextField>
  </div>

  <Teleport :to="props.teleport">
    <Transition name="m3-exposed-dropdown">
      <div
        v-if="open"
        ref="panel"
        class="m3-exposed-dropdown__panel"
        :class="`m3-exposed-dropdown__panel--from-${position.origin}`"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: `${position.maxHeight}px`,
        }"
      >
        <M3LinearProgress
          v-if="props.loading"
          class="m3-exposed-dropdown__loading"
          :label="props.label"
          :wavy="false"
        />
        <div
          :id="listId"
          role="listbox"
          :aria-label="props.label"
          class="m3-exposed-dropdown__list"
        >
          <div
            v-for="({ option, parts }, index) in rows"
            :id="optionId(index)"
            :key="index"
            role="option"
            class="m3-exposed-dropdown__option"
            :class="{
              'm3-exposed-dropdown__option--active': index === active,
              'm3-exposed-dropdown__option--selected': option.value === value,
            }"
            :aria-selected="option.value === value"
            :aria-disabled="option.disabled || undefined"
            @pointerdown.prevent
            @pointerenter="!option.disabled && (active = index)"
            @click="choose(index)"
          >
            <span class="m3-exposed-dropdown__text">
              <span class="m3-exposed-dropdown__label">
                <template v-if="parts"
                  >{{ parts.before }}<strong>{{ parts.match }}</strong
                  >{{ parts.after }}</template
                >
                <template v-else>{{ option.label }}</template>
              </span>
              <span v-if="option.supporting" class="m3-exposed-dropdown__supporting">{{
                option.supporting
              }}</span>
            </span>
            <M3Glyph
              v-if="option.value === value"
              name="check"
              class="m3-exposed-dropdown__check"
            />
          </div>
          <div v-if="shown.length === 0 && !props.loading" class="m3-exposed-dropdown__empty">
            {{ props.noResultsText }}
          </div>
        </div>
      </div>
    </Transition>
    <span v-if="props.editable" class="m3-visually-hidden" aria-live="polite">{{
      open && typed ? props.resultsText(shown.length) : ""
    }}</span>
  </Teleport>
</template>

<style scoped>
.m3-exposed-dropdown {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.m3-exposed-dropdown--select :deep(.m3-text-field__container),
.m3-exposed-dropdown--select :deep(.m3-text-field__input) {
  cursor: pointer;
  caret-color: transparent;
}

.m3-exposed-dropdown__arrow {
  width: 24px;
  height: 24px;
  fill: var(--md-sys-color-on-surface-variant);
  transition: rotate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-exposed-dropdown--open .m3-exposed-dropdown__arrow {
  rotate: 180deg;
}

.m3-exposed-dropdown__panel {
  position: fixed;
  z-index: calc(var(--m3-overlay-z, 12000) + 5);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 16px;
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-level2);
  transform-origin: 50% 0;
}

.m3-exposed-dropdown__panel--from-bottom {
  transform-origin: 50% 100%;
}

.m3-exposed-dropdown__loading {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
}

.m3-exposed-dropdown__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.m3-exposed-dropdown__option {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  box-sizing: border-box;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-exposed-dropdown__option:first-child {
  border-start-start-radius: 12px;
  border-start-end-radius: 12px;
}

.m3-exposed-dropdown__option:last-child {
  border-end-start-radius: 12px;
  border-end-end-radius: 12px;
}

.m3-exposed-dropdown__option--active {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
}

.m3-exposed-dropdown__option--selected {
  border-radius: 12px;
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-exposed-dropdown__option--selected.m3-exposed-dropdown__option--active {
  background: color-mix(
    in srgb,
    var(--md-sys-color-on-tertiary-container) 10%,
    var(--md-sys-color-tertiary-container)
  );
}

.m3-exposed-dropdown__option[aria-disabled="true"] {
  opacity: 0.38;
  cursor: default;
}

.m3-exposed-dropdown__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.m3-exposed-dropdown__label {
  overflow: hidden;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-exposed-dropdown__label strong {
  font-weight: 800;
  color: var(--md-sys-color-on-surface);
}

.m3-exposed-dropdown__supporting {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-exposed-dropdown__option--selected .m3-exposed-dropdown__supporting {
  color: inherit;
}

.m3-exposed-dropdown__check {
  flex: none;
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.m3-exposed-dropdown__empty {
  padding: 12px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-exposed-dropdown-enter-active {
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-exposed-dropdown-leave-active {
  transition:
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-exposed-dropdown-enter-from,
.m3-exposed-dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.8);
}

@media (prefers-reduced-motion: reduce) {
  .m3-exposed-dropdown-enter-from,
  .m3-exposed-dropdown-leave-to {
    transform: none;
  }
}
</style>
