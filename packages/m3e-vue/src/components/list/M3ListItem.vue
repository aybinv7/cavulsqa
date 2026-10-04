<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import {
  computed,
  inject,
  onBeforeUnmount,
  provide,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from "vue";
import { vRipple } from "../../directives/ripple.js";
import { useListSwipe } from "../../composables/useListSwipe.js";
import { LIST_ACCORDION } from "./accordionContext.js";
import { LIST_SORTABLE } from "./sortContext.js";
import { LIST_SWIPE } from "./swipeContext.js";
import type { SwipeSide } from "../../utils/swipe.js";

/**
 * One list item: optional overline, a headline, supporting text, and `leading` / `trailing` slots
 * (icon, avatar, image, switch, meta text). It becomes a button with `clickable`, a link with
 * `href`. Height follows the content: 56, 72 or 88dp for one, two or three lines.
 *
 * `#action` holds a control with its own target - an overflow button, a switch - and is rendered
 * beside the row's tap target, never inside it: a button inside a button is invalid HTML, and
 * WebViews resolve the nested tap unpredictably.
 *
 * `#swipe-start` / `#swipe-end` take `M3SwipeAction`s revealed by dragging the row sideways -
 * Framework7's swipeout in Material form. `v-model:swiped` is the open side; `swipe-full` lets a
 * long swipe fire the outermost action. Vertical scrolling stays native: the row only claims a drag
 * that starts sideways.
 *
 * `#details` makes it expandable - Framework7's accordion item: the row toggles a region below it
 * (`v-model:expanded`), a chevron turns, and the region grows on the default spatial spring. Inside
 * `M3List accordion`, opening one closes the others.
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
    swipeFull?: "start" | "end" | "both";
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
const swiped = defineModel<SwipeSide | null>("swiped", { default: null });
const expanded = defineModel<boolean>("expanded", { default: false });
const slots = useSlots();
const item = useTemplateRef<HTMLElement>("item");
const row = useTemplateRef<HTMLElement>("row");
const swipeStart = useTemplateRef<HTMLElement>("swipeStart");
const swipeEnd = useTemplateRef<HTMLElement>("swipeEnd");
const swipeable = computed(() => Boolean(slots["swipe-start"] || slots["swipe-end"]));

const swipeActions = new Map<HTMLElement, () => void>();
provide(LIST_SWIPE, {
  close: () => (swiped.value = null),
  register: (element, run) => swipeActions.set(element, run),
  unregister: (element) => swipeActions.delete(element),
});
useListSwipe({
  item,
  row,
  start: swipeStart,
  end: swipeEnd,
  swiped,
  full: () => props.swipeFull,
  enabled: () => swipeable.value && !props.disabled,
  fire: (action) => swipeActions.get(action)?.(),
});

const expandable = computed(() => Boolean(slots.details));
const detailsId = useId();
const headlineId = useId();
const accordion = inject(LIST_ACCORDION, null);
const sorting = inject(LIST_SORTABLE, null);
const sortable = computed(() => Boolean(sorting?.enabled()));
const collapse = () => (expanded.value = false);

watch(
  expanded,
  (open) => {
    if (open) accordion?.opened(collapse);
    else accordion?.closed(collapse);
  },
  { immediate: true },
);
onBeforeUnmount(() => accordion?.closed(collapse));

const interactive = computed(() => props.clickable || Boolean(props.href) || expandable.value);
const tag = computed(() => (props.href ? "a" : interactive.value ? "button" : "div"));
const lines = computed(() => {
  const extra =
    Number(Boolean(props.supporting || slots.supporting)) + Number(Boolean(props.overline));
  if (props.multiline && extra > 0) return 3;
  return Math.min(3, 1 + extra);
});

function onClick(event: MouseEvent) {
  if (props.disabled) return;
  if (expandable.value) expanded.value = !expanded.value;
  emit("click", event);
}
</script>

<template>
  <component
    :is="props.as"
    ref="item"
    class="m3-list-item"
    :class="[
      `m3-list-item--lines-${lines}`,
      `m3-list-item--${props.tone}`,
      {
        'm3-list-item--selected': props.selected,
        'm3-list-item--disabled': props.disabled,
        'm3-list-item--with-action': $slots.action,
        'm3-list-item--swipe': swipeable,
        'm3-list-item--expandable': expandable,
        'm3-list-item--expanded': expandable && expanded,
        'm3-list-item--sortable': sortable,
      },
    ]"
  >
    <div
      v-if="$slots['swipe-start']"
      ref="swipeStart"
      class="m3-list-item__swipe m3-list-item__swipe--start"
      :inert="swiped !== 'start'"
    >
      <slot name="swipe-start" />
    </div>
    <div
      v-if="$slots['swipe-end']"
      ref="swipeEnd"
      class="m3-list-item__swipe m3-list-item__swipe--end"
      :inert="swiped !== 'end'"
    >
      <slot name="swipe-end" />
    </div>
    <div ref="row" class="m3-list-item__row">
      <component
        :is="tag"
        v-ripple="interactive && !props.disabled"
        class="m3-list-item__surface"
        :class="{ 'm3-state m3-focus-ring': interactive }"
        :href="props.href && !props.disabled ? props.href : undefined"
        :type="tag === 'button' ? 'button' : undefined"
        :disabled="tag === 'button' ? props.disabled : undefined"
        :aria-current="props.selected && props.href ? 'page' : undefined"
        :aria-pressed="props.selected && tag === 'button' && !expandable ? true : undefined"
        :aria-expanded="expandable ? expanded : undefined"
        :aria-controls="expandable ? detailsId : undefined"
        @click="onClick"
      >
        <span v-if="$slots.leading" class="m3-list-item__leading"><slot name="leading" /></span>
        <span class="m3-list-item__text">
          <span v-if="props.overline" class="m3-list-item__overline">{{ props.overline }}</span>
          <span :id="headlineId" class="m3-list-item__headline"
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
        <span v-if="expandable" class="m3-list-item__expand" aria-hidden="true"
          ><M3Glyph name="expandMore"
        /></span>
      </component>
      <span v-if="$slots.action" class="m3-list-item__action"><slot name="action" /></span>
      <button
        v-if="sortable"
        type="button"
        class="m3-list-item__handle m3-focus-ring"
        data-sort-handle
        :aria-label="sorting?.label()"
      >
        <M3Glyph name="dragHandle" />
      </button>
    </div>
    <div
      v-if="expandable"
      :id="detailsId"
      class="m3-list-item__details"
      role="region"
      :aria-labelledby="headlineId"
      :inert="!expanded"
    >
      <div class="m3-list-item__details-clip">
        <div class="m3-list-item__details-content"><slot name="details" /></div>
      </div>
    </div>
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

.m3-list-item__row {
  position: relative;
  z-index: 1;
}

.m3-list-item--swipe {
  overflow: hidden;
  border-start-start-radius: var(--m3-list-item-start);
  border-start-end-radius: var(--m3-list-item-start);
  border-end-start-radius: var(--m3-list-item-end);
  border-end-end-radius: var(--m3-list-item-end);
}

.m3-list-item--swipe .m3-list-item__row {
  background: var(--m3-swipe-surface, var(--md-sys-color-surface));
  touch-action: pan-y;
}

.m3-list-item__swipe {
  position: absolute;
  inset-block: 0;
  z-index: 0;
  display: flex;
  width: 0;
  overflow: hidden;
}

.m3-list-item__swipe--start {
  inset-inline-start: 0;
}

.m3-list-item__swipe--end {
  inset-inline-end: 0;
}

.m3-list-item--swipe.m3-list-item--swiping,
.m3-list-item--swiping .m3-list-item__surface {
  border-radius: 16px;
}

.m3-list-item__swipe--armed.m3-list-item__swipe--start :deep(.m3-swipe-action:first-child),
.m3-list-item__swipe--armed.m3-list-item__swipe--end :deep(.m3-swipe-action:last-child) {
  flex-grow: 100;
}

.m3-list-item__swipe--armed.m3-list-item__swipe--start
  :deep(.m3-swipe-action:first-child .m3-swipe-action__button),
.m3-list-item__swipe--armed.m3-list-item__swipe--end
  :deep(.m3-swipe-action:last-child .m3-swipe-action__button) {
  width: calc(100% - 16px);
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

.m3-list-item--sortable .m3-list-item__surface {
  padding-inline-end: 64px;
}

.m3-list-item__handle {
  position: absolute;
  top: 50%;
  inset-inline-end: 8px;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  translate: 0 -50%;
  touch-action: none;
  cursor: grab;
  -webkit-tap-highlight-color: transparent;
}

.m3-list-item__handle :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-list-item--dragging {
  z-index: 3;
}

.m3-list-item--dragging .m3-list-item__surface {
  border-radius: 16px;
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
  box-shadow: var(--md-sys-elevation-level4);
}

.m3-list-item--dragging .m3-list-item__leading,
.m3-list-item--dragging .m3-list-item__supporting,
.m3-list-item--dragging .m3-list-item__handle {
  color: inherit;
}

.m3-list-item--dragging .m3-list-item__handle {
  cursor: grabbing;
}

.m3-list-item--dropping {
  transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-list-item--expandable {
  border-start-start-radius: var(--m3-list-item-start);
  border-start-end-radius: var(--m3-list-item-start);
  border-end-start-radius: var(--m3-list-item-end);
  border-end-end-radius: var(--m3-list-item-end);
  background: var(--m3-list-item-container);
  transition:
    border-radius var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial),
    margin var(--md-sys-motion-spring-default-spatial-duration)
      var(--md-sys-motion-spring-default-spatial);
}

.m3-list-item--expandable .m3-list-item__surface {
  background: transparent;
}

.m3-list-item--expanded .m3-list-item__surface {
  border-end-start-radius: 4px;
  border-end-end-radius: 4px;
}

.m3-list-item__expand {
  display: flex;
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  transition: rotate var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-list-item__expand :deep(svg) {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.m3-list-item--expanded .m3-list-item__expand {
  rotate: 180deg;
}

.m3-list-item__details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-list-item--expanded .m3-list-item__details {
  grid-template-rows: 1fr;
}

.m3-list-item__details-clip {
  min-height: 0;
  overflow: hidden;
}

.m3-list-item__details-content {
  padding: 0 16px 16px;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
  opacity: 0;
  transition: opacity var(--md-sys-motion-spring-default-effects-duration)
    var(--md-sys-motion-spring-default-effects);
}

.m3-list-item--expanded .m3-list-item__details-content {
  opacity: 1;
}

.m3-list-item--disabled .m3-list-item__leading,
.m3-list-item--disabled .m3-list-item__trailing,
.m3-list-item--disabled .m3-list-item__supporting {
  color: inherit;
}
</style>
