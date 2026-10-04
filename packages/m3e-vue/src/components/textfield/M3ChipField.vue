<script setup lang="ts">
import M3Chip from "../chip/M3Chip.vue";
import { computed, nextTick, shallowRef, useId, useTemplateRef } from "vue";
import { useHaptics } from "../../composables/services.js";
import { hasEntry, splitEntries } from "../../utils/chipField.js";

/**
 * A field that turns what is typed into input chips - tags, recipients, routes. Enter or a
 * separator finishes an entry, and a pasted "north, south, east" becomes three. Backspace in the
 * empty input first marks the last chip, then removes it, so one stray press never deletes. A
 * duplicate flashes the chip already there; an entry `validate` rejects stays in the input with
 * the field shaking. Outlined, with its label cut into the outline like the outlined text field.
 *
 * @see https://m3.material.io/components/chips/guidelines
 */
const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    supporting?: string;
    error?: string;
    max?: number;
    separators?: readonly string[];
    validate?: (value: string) => boolean;
    removeLabel?: (value: string) => string;
    disabled?: boolean;
  }>(),
  {
    separators: () => [",", ";"],
    removeLabel: (value: string) => `Remove ${value}`,
    disabled: false,
  },
);

const model = defineModel<string[]>({ default: () => [] });

const input = useTemplateRef<HTMLInputElement>("input");
const haptics = useHaptics();
const id = useId();
const supportId = `${id}-support`;
const draft = shallowRef("");
const focused = shallowRef(false);
const marked = shallowRef(false);
const flashing = shallowRef<string | null>(null);
const shaking = shallowRef(false);

const full = computed(() => props.max !== undefined && model.value.length >= props.max);
const message = computed(() => props.error || props.supporting);

function shake() {
  shaking.value = false;
  requestAnimationFrame(() => (shaking.value = true));
  haptics.confirm();
}

function flash(value: string) {
  const existing = model.value.find((entry) => hasEntry([entry], value)) ?? null;
  flashing.value = null;
  requestAnimationFrame(() => (flashing.value = existing));
}

/** Adds what it can of `entries`; returns the first one it refused, to leave in the input. */
function add(entries: readonly string[]): string | null {
  const next = [...model.value];
  let refused: string | null = null;
  for (const raw of entries) {
    const value = raw.trim();
    if (!value) continue;
    if (props.max !== undefined && next.length >= props.max) {
      refused ??= value;
      continue;
    }
    if (hasEntry(next, value)) {
      flash(value);
      continue;
    }
    if (props.validate && !props.validate(value)) {
      refused ??= value;
      continue;
    }
    next.push(value);
  }
  if (next.length !== model.value.length) {
    model.value = next;
    haptics.tick();
  }
  if (refused !== null) shake();
  return refused;
}

function onInput(event: Event) {
  marked.value = false;
  const element = event.target as HTMLInputElement;
  const { entries, rest } = splitEntries(element.value, props.separators);
  if (entries.length === 0) {
    draft.value = element.value;
    return;
  }
  draft.value = add(entries) ?? rest;
  element.value = draft.value;
}

function commit() {
  if (!draft.value.trim()) return;
  const refused = add([draft.value]);
  draft.value = refused ?? "";
}

function remove(index: number) {
  model.value = model.value.filter((_, at) => at !== index);
  marked.value = false;
  void nextTick(() => input.value?.focus({ preventScroll: true }));
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.key === "Enter") {
    event.preventDefault();
    commit();
    return;
  }
  if (event.key === "Backspace" && draft.value === "" && model.value.length > 0) {
    event.preventDefault();
    if (marked.value) remove(model.value.length - 1);
    else marked.value = true;
    return;
  }
  marked.value = false;
}

function onBlur() {
  focused.value = false;
  marked.value = false;
  commit();
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <div
    class="m3-chip-field"
    :class="{
      'm3-chip-field--focused': focused,
      'm3-chip-field--error': props.error,
      'm3-chip-field--disabled': props.disabled,
      'm3-chip-field--shaking': shaking,
    }"
    @animationend.self="shaking = false"
  >
    <div class="m3-chip-field__box" @click="input?.focus()">
      <label class="m3-chip-field__label" :for="id">{{ props.label }}</label>
      <TransitionGroup name="m3-chip-field" tag="ul" class="m3-chip-field__chips" role="list">
        <li
          v-for="(entry, index) in model"
          :key="entry"
          class="m3-chip-field__chip"
          :class="{
            'm3-chip-field__chip--marked': marked && index === model.length - 1,
            'm3-chip-field__chip--flash': flashing === entry,
          }"
          @animationend="flashing = null"
        >
          <M3Chip
            kind="input"
            removable
            :label="entry"
            :remove-label="props.removeLabel(entry)"
            :disabled="props.disabled"
            @remove="remove(index)"
          />
        </li>
        <li key="m3-chip-field-input" class="m3-chip-field__entry">
          <input
            :id="id"
            ref="input"
            class="m3-chip-field__input"
            :value="draft"
            :placeholder="full ? undefined : props.placeholder"
            :disabled="props.disabled"
            :aria-invalid="Boolean(props.error) || undefined"
            :aria-describedby="message ? supportId : undefined"
            enterkeyhint="done"
            autocomplete="off"
            @input="onInput"
            @keydown="onKeydown"
            @focus="focused = true"
            @blur="onBlur"
          />
        </li>
      </TransitionGroup>
    </div>
    <div v-if="message || props.max" class="m3-chip-field__supporting">
      <span :id="supportId" :role="props.error ? 'alert' : undefined">{{ message }}</span>
      <span v-if="props.max" class="m3-chip-field__counter"
        >{{ model.length }}/{{ props.max }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.m3-chip-field {
  --m3-chip-field-accent: var(--md-sys-color-primary);

  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.m3-chip-field--error {
  --m3-chip-field-accent: var(--md-sys-color-error);
}

.m3-chip-field__box {
  position: relative;
  min-height: 56px;
  padding: 10px 12px;
  box-sizing: border-box;
  border-radius: var(--md-sys-shape-corner-extra-small);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  cursor: text;
  transition: box-shadow var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-chip-field--focused .m3-chip-field__box,
.m3-chip-field--error .m3-chip-field__box {
  box-shadow: inset 0 0 0 2px var(--m3-chip-field-accent);
}

.m3-chip-field__label {
  position: absolute;
  top: 0;
  inset-inline-start: 12px;
  padding: 0 4px;
  transform: translateY(-50%);
  background: var(--m3-text-field-notch, var(--md-sys-color-surface));
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-chip-field--focused .m3-chip-field__label,
.m3-chip-field--error .m3-chip-field__label {
  color: var(--m3-chip-field-accent);
}

.m3-chip-field__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.m3-chip-field__chip {
  display: flex;
  border-radius: var(--md-sys-shape-corner-small);
  transition: box-shadow var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-chip-field__chip--marked {
  box-shadow: 0 0 0 2px var(--md-sys-color-primary);
}

.m3-chip-field__entry {
  display: flex;
  flex: 1 1 96px;
  min-width: 96px;
}

.m3-chip-field__input {
  width: 100%;
  min-height: 32px;
  margin: 0;
  padding: 0 4px;
  border: 0;
  outline: none;
  background: none;
  color: var(--md-sys-color-on-surface);
  caret-color: var(--m3-chip-field-accent);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
}

.m3-chip-field__input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
}

.m3-chip-field__supporting {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-chip-field--error .m3-chip-field__supporting {
  color: var(--md-sys-color-error);
}

.m3-chip-field__counter {
  margin-inline-start: auto;
  font-variant-numeric: tabular-nums;
}

.m3-chip-field--disabled {
  opacity: 0.38;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .m3-chip-field-enter-active {
    transition:
      opacity var(--md-sys-motion-spring-fast-effects-duration)
        var(--md-sys-motion-spring-fast-effects),
      transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .m3-chip-field-leave-active {
    position: absolute;
    transition:
      opacity var(--md-sys-motion-spring-fast-effects-duration)
        var(--md-sys-motion-spring-fast-effects),
      transform var(--md-sys-motion-spring-fast-spatial-duration)
        var(--md-sys-motion-spring-fast-spatial);
  }

  .m3-chip-field-move {
    transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
  }

  .m3-chip-field__chip--flash {
    animation: m3-chip-field-flash 520ms var(--md-sys-motion-easing-emphasized-decelerate);
  }

  .m3-chip-field--shaking {
    animation: m3-chip-field-shake 420ms var(--md-sys-motion-easing-emphasized-decelerate);
  }
}

.m3-chip-field-enter-from,
.m3-chip-field-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

@keyframes m3-chip-field-flash {
  30% {
    transform: scale(1.12);
    box-shadow: 0 0 0 3px var(--md-sys-color-tertiary);
  }
}

@keyframes m3-chip-field-shake {
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}
</style>
