<script setup lang="ts">
import { computed, useSlots } from "vue";
import { vRipple } from "../../directives/ripple.js";

/**
 * One list item: optional overline, a headline, supporting text, and `leading` / `trailing` slots
 * (icon, avatar, image, switch, meta text). It becomes a button with `clickable`, a link with
 * `href`. Height follows the content: 56, 72 or 88dp for one, two or three lines.
 *
 * `#action` holds a control with its own target - an overflow button, a switch - and is rendered
 * beside the row's tap target, never inside it: a button inside a button is invalid HTML, and
 * WebViews resolve the nested tap unpredictably.
 */
const props = withDefaults(
  defineProps<{
    headline?: string;
    supporting?: string;
    overline?: string;
    trailingText?: string;
    clickable?: boolean;
    href?: string;
    selected?: boolean;
    disabled?: boolean;
    /** Lets supporting text wrap to two lines (a three-line item). */
    multiline?: boolean;
    tone?: "default" | "destructive";
    /** `div` when a parent already supplies the list-item role, as `M3VirtualList` rows do. */
    as?: "li" | "div";
  }>(),
  {
    clickable: false,
    selected: false,
    disabled: false,
    multiline: false,
    tone: "default",
    as: "li",
  },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
const slots = useSlots();

const interactive = computed(() => props.clickable || Boolean(props.href));
const tag = computed(() => (props.href ? "a" : interactive.value ? "button" : "div"));
const lines = computed(() => {
  const extra =
    Number(Boolean(props.supporting || slots.supporting)) + Number(Boolean(props.overline));
  if (props.multiline && extra > 0) return 3;
  return Math.min(3, 1 + extra);
});

function onClick(event: MouseEvent) {
  if (props.disabled) return;
  emit("click", event);
}
</script>

<template>
  <component
    :is="props.as"
    class="m3-list-item"
    :class="[
      `m3-list-item--lines-${lines}`,
      `m3-list-item--${props.tone}`,
      {
        'm3-list-item--selected': props.selected,
        'm3-list-item--disabled': props.disabled,
        'm3-list-item--with-action': $slots.action,
      },
    ]"
  >
    <component
      :is="tag"
      v-ripple="interactive && !props.disabled"
      class="m3-list-item__surface"
      :class="{ 'm3-state m3-focus-ring': interactive }"
      :href="props.href && !props.disabled ? props.href : undefined"
      :type="tag === 'button' ? 'button' : undefined"
      :disabled="tag === 'button' ? props.disabled : undefined"
      :aria-current="props.selected && props.href ? 'page' : undefined"
      :aria-pressed="props.selected && tag === 'button' ? true : undefined"
      @click="onClick"
    >
      <span v-if="$slots.leading" class="m3-list-item__leading"><slot name="leading" /></span>
      <span class="m3-list-item__text">
        <span v-if="props.overline" class="m3-list-item__overline">{{ props.overline }}</span>
        <span class="m3-list-item__headline"
          ><slot>{{ props.headline }}</slot></span
        >
        <span v-if="props.supporting || $slots.supporting" class="m3-list-item__supporting">
          <slot name="supporting">{{ props.supporting }}</slot>
        </span>
      </span>
      <span v-if="props.trailingText" class="m3-list-item__trailing-text">{{
        props.trailingText
      }}</span>
      <span v-if="$slots.trailing" class="m3-list-item__trailing"><slot name="trailing" /></span>
    </component>
    <span v-if="$slots.action" class="m3-list-item__action"><slot name="action" /></span>
  </component>
</template>

<style scoped>
.m3-list-item {
  --m3-list-item-container: transparent;
  --m3-list-item-start: 0px;
  --m3-list-item-end: 0px;
  position: relative;
  display: block;
}

.m3-list-item--with-action {
  --m3-list-item-action-width: 48px;
}

.m3-list-item--with-action:has(.m3-switch) {
  --m3-list-item-action-width: 52px;
}

.m3-list-item--with-action .m3-list-item__surface {
  padding-inline-end: calc(28px + var(--m3-list-item-action-width));
}

.m3-list-item__action {
  position: absolute;
  top: 50%;
  inset-inline-end: 16px;
  display: flex;
  align-items: center;
  color: var(--md-sys-color-on-surface-variant);
  translate: 0 -50%;
}

.m3-list-item__surface {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-height: 56px;
  margin: 0;
  padding: 10px 16px;
  border: 0;
  border-start-start-radius: var(--m3-list-item-start);
  border-start-end-radius: var(--m3-list-item-start);
  border-end-start-radius: var(--m3-list-item-end);
  border-end-end-radius: var(--m3-list-item-end);
  background: var(--m3-list-item-container);
  color: var(--md-sys-color-on-surface);
  font: inherit;
  text-align: start;
  text-decoration: none;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

button.m3-list-item__surface,
a.m3-list-item__surface {
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.m3-list-item--lines-2 .m3-list-item__surface {
  min-height: 72px;
}

.m3-list-item--lines-3 .m3-list-item__surface {
  align-items: flex-start;
  min-height: 88px;
  padding-block: 12px;
}

.m3-list-item__surface[data-pressed],
.m3-list-item--selected .m3-list-item__surface {
  border-radius: 16px;
}

.m3-list-item--selected .m3-list-item__surface {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-list-item__leading,
.m3-list-item__trailing {
  display: flex;
  flex: none;
  align-items: center;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 24px;
}

.m3-list-item__leading :deep(svg),
.m3-list-item__trailing :deep(svg) {
  width: 24px;
  height: 24px;
}

.m3-list-item--selected .m3-list-item__leading,
.m3-list-item--selected .m3-list-item__trailing {
  color: inherit;
}

.m3-list-item__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.m3-list-item__overline {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) /
    var(--md-sys-typescale-label-small-line-height) var(--md-sys-typescale-label-small-font);
  letter-spacing: var(--md-sys-typescale-label-small-tracking);
}

.m3-list-item__headline {
  overflow: hidden;
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) /
    var(--md-sys-typescale-body-large-line-height) var(--md-sys-typescale-body-large-font);
  letter-spacing: var(--md-sys-typescale-body-large-tracking);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-list-item__supporting {
  display: -webkit-box;
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
  letter-spacing: var(--md-sys-typescale-body-medium-tracking);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.m3-list-item--lines-3 .m3-list-item__supporting {
  -webkit-line-clamp: 2;
}

.m3-list-item--selected .m3-list-item__supporting {
  color: inherit;
}

.m3-list-item__trailing-text {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) /
    var(--md-sys-typescale-label-small-line-height) var(--md-sys-typescale-label-small-font);
}

.m3-list-item--destructive .m3-list-item__surface,
.m3-list-item--destructive .m3-list-item__leading {
  color: var(--md-sys-color-error);
}

.m3-list-item--disabled .m3-list-item__surface {
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  cursor: default;
  pointer-events: none;
}

.m3-list-item--disabled .m3-list-item__leading,
.m3-list-item--disabled .m3-list-item__trailing,
.m3-list-item--disabled .m3-list-item__supporting {
  color: inherit;
}
</style>
