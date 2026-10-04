<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from "vue";
import { useHaptics } from "../../composables/services.js";
import { sanitizeCode, type CodeAlphabet } from "../../utils/codeField.js";

/**
 * A verification code typed into a row of cells, as every sign-in flow asks for one. Under the
 * cells is one real input, so the SMS code the keyboard suggests (`one-time-code`), a pasted
 * message, an IME and a screen reader all work as they do on any field; the cells only draw it.
 * What the alphabet does not allow is dropped, a pasted "Code: 482 913" fills all six, and a full
 * code emits `complete`.
 *
 * Codes read left to right in every language, so the cells do too in a right-to-left layout.
 * A filled cell rounds off and its character springs in; `error` turns the row to the error
 * colours with a shake, and typing again clears it for the caller to re-check. `success` turns it
 * to the primary colours in a wave and makes it read-only - the code was accepted.
 *
 * @see https://m3.material.io/components/text-fields/guidelines
 */
const props = withDefaults(
  defineProps<{
    label: string;
    length?: number;
    alphabet?: CodeAlphabet;
    /** Cells per group, drawn with a wider gap between groups; 0 keeps one row. */
    group?: number;
    mask?: boolean;
    error?: string;
    supporting?: string;
    success?: boolean;
    disabled?: boolean;
  }>(),
  { length: 6, alphabet: "numeric", mask: false, success: false, disabled: false },
);

const model = defineModel<string>({ default: "" });
const emit = defineEmits<{ complete: [code: string] }>();

const input = useTemplateRef<HTMLInputElement>("input");
const haptics = useHaptics();
const focused = shallowRef(false);
const shaking = shallowRef(false);
const id = useId();
const supportId = `${id}-support`;

const size = computed(() => Math.max(1, Math.floor(props.length)));
const groupSize = computed(() => props.group ?? (size.value % 3 === 0 && size.value > 3 ? 3 : 0));
const code = computed(() => sanitizeCode(model.value, size.value, props.alphabet));
const cursor = computed(() => Math.min(code.value.length, size.value - 1));
const message = computed(() => props.error || props.supporting);

function onInput(event: Event) {
  const element = event.target as HTMLInputElement;
  const next = sanitizeCode(element.value, size.value, props.alphabet);
  element.value = next;
  if (next === model.value) return;
  const grew = next.length > model.value.length;
  model.value = next;
  if (grew) haptics.tick();
  if (next.length === size.value) emit("complete", next);
}

function pinCaret() {
  const element = input.value;
  if (!element) return;
  const end = element.value.length;
  element.setSelectionRange(end, end);
}

function onFocus() {
  focused.value = true;
  requestAnimationFrame(pinCaret);
}

watch(
  () => props.error,
  (error, before) => {
    if (!error || error === before) return;
    shaking.value = false;
    requestAnimationFrame(() => (shaking.value = true));
    haptics.confirm();
  },
);

defineExpose({
  focus: () => input.value?.focus(),
  clear: () => {
    model.value = "";
    input.value?.focus();
  },
});
</script>

<template>
  <div
    class="m3-code-field"
    :class="{
      'm3-code-field--error': props.error,
      'm3-code-field--success': props.success && !props.error,
      'm3-code-field--disabled': props.disabled,
      'm3-code-field--shaking': shaking,
    }"
    @animationend.self="shaking = false"
  >
    <div class="m3-code-field__row">
      <input
        :id="id"
        ref="input"
        class="m3-code-field__input"
        :value="code"
        :maxlength="size"
        :inputmode="props.alphabet === 'numeric' ? 'numeric' : 'text'"
        :pattern="props.alphabet === 'numeric' ? '[0-9]*' : undefined"
        :type="props.mask ? 'password' : 'text'"
        autocomplete="one-time-code"
        autocapitalize="characters"
        spellcheck="false"
        :aria-label="props.label"
        :aria-invalid="Boolean(props.error) || undefined"
        :aria-describedby="message ? supportId : undefined"
        :disabled="props.disabled"
        :readonly="props.success"
        @input="onInput"
        @focus="onFocus"
        @blur="focused = false"
        @click="pinCaret"
        @keyup="pinCaret"
      />
      <span
        v-for="index in size"
        :key="index"
        class="m3-code-field__cell"
        :class="{
          'm3-code-field__cell--filled': index <= code.length,
          'm3-code-field__cell--active': focused && index - 1 === cursor,
          'm3-code-field__cell--break': groupSize > 0 && index > 1 && (index - 1) % groupSize === 0,
        }"
        :style="{ '--m3-code-index': index - 1 }"
        aria-hidden="true"
      >
        <span v-if="index <= code.length" :key="code[index - 1]" class="m3-code-field__char">{{
          props.mask ? "•" : code[index - 1]
        }}</span>
        <span v-else-if="focused && index - 1 === cursor" class="m3-code-field__caret" />
      </span>
    </div>
    <p
      v-if="message"
      :id="supportId"
      class="m3-code-field__supporting"
      :role="props.error ? 'alert' : undefined"
    >
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
.m3-code-field {
  --m3-code-accent: var(--md-sys-color-primary);
  --m3-code-cell: var(--md-sys-color-surface-container-highest);
  --m3-code-filled: var(--md-sys-color-secondary-container);
  --m3-code-content: var(--md-sys-color-on-secondary-container);

  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m3-code-field--error {
  --m3-code-accent: var(--md-sys-color-error);
  --m3-code-cell: var(--md-sys-color-error-container);
  --m3-code-filled: var(--md-sys-color-error-container);
  --m3-code-content: var(--md-sys-color-on-error-container);
}

.m3-code-field--success {
  --m3-code-filled: var(--md-sys-color-primary);
  --m3-code-content: var(--md-sys-color-on-primary);
}

.m3-code-field__row {
  position: relative;
  display: flex;
  gap: 8px;
  direction: ltr;
}

.m3-code-field__input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font-size: 16px;
  letter-spacing: 2em;
  opacity: 0.01;
  cursor: text;
}

.m3-code-field__input::selection {
  background: transparent;
}

.m3-code-field__cell {
  position: relative;
  display: grid;
  flex: 1 1 0;
  max-width: 52px;
  aspect-ratio: 48 / 58;
  place-items: center;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--m3-code-cell);
  color: var(--m3-code-content);
  font: var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) /
    1 var(--md-sys-typescale-headline-small-font);
  font-variant-numeric: tabular-nums;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    box-shadow var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-code-field__cell--break {
  margin-inline-start: 8px;
}

.m3-code-field__cell--filled {
  border-radius: var(--md-sys-shape-corner-large-increased, 20px);
  background: var(--m3-code-filled);
}

.m3-code-field__cell--active {
  box-shadow: inset 0 0 0 2px var(--m3-code-accent);
}

.m3-code-field--disabled .m3-code-field__cell {
  opacity: 0.38;
}

.m3-code-field__caret {
  width: 2px;
  height: 40%;
  border-radius: 1px;
  background: var(--m3-code-accent);
  animation: m3-code-caret 1s steps(1) infinite;
}

.m3-code-field__supporting {
  margin: 0;
  padding: 0 4px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-code-field--error .m3-code-field__supporting {
  color: var(--md-sys-color-error);
}

.m3-code-field--success .m3-code-field__supporting {
  color: var(--md-sys-color-primary);
}

.m3-code-field--success .m3-code-field__cell--active {
  box-shadow: none;
}

@media (prefers-reduced-motion: no-preference) {
  .m3-code-field__char {
    animation: m3-code-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .m3-code-field--success .m3-code-field__cell {
    animation: m3-code-wave 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(var(--m3-code-index) * 45ms);
  }

  .m3-code-field--shaking {
    animation: m3-code-shake 420ms var(--md-sys-motion-easing-emphasized-decelerate);
  }
}

@keyframes m3-code-caret {
  50% {
    opacity: 0;
  }
}

@keyframes m3-code-pop {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.4);
  }
}

@keyframes m3-code-wave {
  40% {
    transform: translateY(-8px) scale(1.06);
  }
}

@keyframes m3-code-shake {
  15%,
  55% {
    transform: translateX(-8px);
  }
  35%,
  75% {
    transform: translateX(8px);
  }
  90% {
    transform: translateX(-2px);
  }
}
</style>
