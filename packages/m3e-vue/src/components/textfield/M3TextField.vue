<script setup lang="ts">
import { computed, shallowRef, useId } from "vue";

/**
 * The M3 text field, filled or outlined, with a label that floats up on focus or content,
 * supporting text, an error state with its message, a character counter, and `leading` /
 * `trailing` slots for icons. Native input attributes (`type`, `inputmode`, `autocomplete`...)
 * pass through to the input.
 *
 * @see https://m3.material.io/components/text-fields/specs
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    label: string;
    variant?: "filled" | "outlined";
    supporting?: string;
    error?: string;
    maxlength?: number;
    multiline?: boolean;
    rows?: number;
    disabled?: boolean;
    readonly?: boolean;
    prefix?: string;
    suffix?: string;
  }>(),
  { variant: "filled", multiline: false, rows: 3, disabled: false, readonly: false },
);

const model = defineModel<string>({ default: "" });
const focused = shallowRef(false);
const id = useId();
const supportId = `${id}-support`;

const floated = computed(() => focused.value || model.value.length > 0 || Boolean(props.prefix));
const message = computed(() => props.error || props.supporting);
</script>

<template>
  <div
    class="m3-text-field"
    :class="[
      `m3-text-field--${props.variant}`,
      {
        'm3-text-field--focused': focused,
        'm3-text-field--floated': floated,
        'm3-text-field--error': props.error,
        'm3-text-field--disabled': props.disabled,
        'm3-text-field--leading': $slots.leading,
      },
    ]"
  >
    <label class="m3-text-field__container" :for="id">
      <span v-if="$slots.leading" class="m3-text-field__icon"><slot name="leading" /></span>
      <span class="m3-text-field__body">
        <span class="m3-text-field__label">{{ props.label }}</span>
        <span class="m3-text-field__row">
          <span v-if="props.prefix" class="m3-text-field__affix">{{ props.prefix }}</span>
          <textarea
            v-if="props.multiline"
            :id="id"
            v-bind="$attrs"
            v-model="model"
            class="m3-text-field__input"
            :rows="props.rows"
            :maxlength="props.maxlength"
            :disabled="props.disabled"
            :readonly="props.readonly"
            :aria-invalid="Boolean(props.error) || undefined"
            :aria-describedby="message ? supportId : undefined"
            @focus="focused = true"
            @blur="focused = false"
          />
          <input
            v-else
            :id="id"
            v-bind="$attrs"
            v-model="model"
            class="m3-text-field__input"
            :maxlength="props.maxlength"
            :disabled="props.disabled"
            :readonly="props.readonly"
            :aria-invalid="Boolean(props.error) || undefined"
            :aria-describedby="message ? supportId : undefined"
            @focus="focused = true"
            @blur="focused = false"
          />
          <span v-if="props.suffix" class="m3-text-field__affix">{{ props.suffix }}</span>
        </span>
      </span>
      <span v-if="$slots.trailing" class="m3-text-field__icon"><slot name="trailing" /></span>
      <span v-if="props.variant === 'outlined'" class="m3-text-field__outline" aria-hidden="true">
        <span class="m3-text-field__notch">{{ props.label }}</span>
      </span>
    </label>
    <div v-if="message || props.maxlength" class="m3-text-field__supporting">
      <span :id="supportId" :role="props.error ? 'alert' : undefined">{{ message }}</span>
      <span v-if="props.maxlength" class="m3-text-field__counter"
        >{{ model.length }}/{{ props.maxlength }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.m3-text-field {
  --m3-tf-accent: var(--md-sys-color-primary);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.m3-text-field--error {
  --m3-tf-accent: var(--md-sys-color-error);
}

.m3-text-field__container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 56px;
  padding: 0 16px;
  cursor: text;
}

.m3-text-field--leading .m3-text-field__container {
  padding-inline-start: 12px;
}

.m3-text-field--filled .m3-text-field__container {
  border-radius: 4px 4px 0 0;
  background: var(--md-sys-color-surface-container-highest);
}

.m3-text-field--filled .m3-text-field__container::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: var(--md-sys-color-on-surface-variant);
  transition:
    height var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-text-field--filled.m3-text-field--focused .m3-text-field__container::after,
.m3-text-field--filled.m3-text-field--error .m3-text-field__container::after {
  height: 2px;
  background: var(--m3-tf-accent);
}

.m3-text-field__body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  align-self: stretch;
}

.m3-text-field__label {
  position: absolute;
  top: 50%;
  inset-inline-start: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateY(-50%);
  transform-origin: 0 0;
  pointer-events: none;
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    color var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}

.m3-text-field--filled.m3-text-field--floated .m3-text-field__label {
  transform: translateY(-115%) scale(0.75);
}

.m3-text-field--outlined.m3-text-field--floated .m3-text-field__label {
  opacity: 0;
}

.m3-text-field--focused .m3-text-field__label,
.m3-text-field--error .m3-text-field__label {
  color: var(--m3-tf-accent);
}

.m3-text-field__row {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.m3-text-field--filled .m3-text-field__row {
  padding-top: 18px;
}

.m3-text-field__input {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 8px 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  caret-color: var(--m3-tf-accent);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  resize: none;
}

.m3-text-field--filled .m3-text-field__input {
  padding: 0 0 8px;
}

.m3-text-field:not(.m3-text-field--floated) .m3-text-field__input::placeholder {
  color: transparent;
}

.m3-text-field__affix {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
}

.m3-text-field__icon {
  display: grid;
  flex: none;
  place-items: center;
  min-width: 24px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 24px;
}

.m3-text-field__icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.m3-text-field--error .m3-text-field__icon:last-child {
  color: var(--md-sys-color-error);
}

.m3-text-field__outline {
  position: absolute;
  inset: 0;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 4px;
  pointer-events: none;
  transition: border-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-text-field--focused .m3-text-field__outline,
.m3-text-field--error .m3-text-field__outline {
  border-width: 2px;
  border-color: var(--m3-tf-accent);
}

.m3-text-field__notch {
  position: absolute;
  top: 0;
  inset-inline-start: 12px;
  padding: 0 4px;
  background: var(--m3-text-field-notch, var(--md-sys-color-surface));
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-text-field--floated .m3-text-field__notch {
  opacity: 1;
}

.m3-text-field--focused .m3-text-field__notch,
.m3-text-field--error .m3-text-field__notch {
  color: var(--m3-tf-accent);
}

.m3-text-field__supporting {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 16px 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-text-field--error .m3-text-field__supporting {
  color: var(--md-sys-color-error);
}

.m3-text-field__counter {
  margin-inline-start: auto;
  font-variant-numeric: tabular-nums;
}

.m3-text-field--disabled {
  opacity: 0.38;
  pointer-events: none;
}
</style>
