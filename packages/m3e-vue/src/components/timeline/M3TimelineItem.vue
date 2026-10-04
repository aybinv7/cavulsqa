<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import M3Shape from "../shape/M3Shape.vue";

/**
 * One step of an `M3Timeline`. `done` steps show a filled marker with a check and a `primary` line
 * to the next; the `current` step a larger expressive shape in `primary-container` holding its
 * `#icon`; `upcoming` steps an outlined marker on an `outline-variant` line. `time` sits above the
 * title; the default slot holds anything more - a note, a photo, an action. `stateLabel` is read
 * out with the title, so a screen reader hears "Delivered, done" rather than only the colour.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    time?: string;
    supporting?: string;
    state?: "done" | "current" | "upcoming";
    stateLabel?: string;
  }>(),
  { state: "upcoming" },
);
</script>

<template>
  <li
    class="m3-timeline-item"
    :class="`m3-timeline-item--${props.state}`"
    :aria-current="props.state === 'current' ? 'step' : undefined"
  >
    <span class="m3-timeline-item__rail" aria-hidden="true">
      <M3Shape
        v-if="props.state === 'current'"
        shape="cookie9Sided"
        class="m3-timeline-item__current"
      >
        <slot name="icon"><span class="m3-timeline-item__pip" /></slot>
      </M3Shape>
      <span v-else class="m3-timeline-item__marker">
        <M3Glyph v-if="props.state === 'done'" name="check" />
      </span>
      <span class="m3-timeline-item__line" />
    </span>
    <span class="m3-timeline-item__body">
      <span v-if="props.time" class="m3-timeline-item__time">{{ props.time }}</span>
      <span class="m3-timeline-item__title"
        >{{ props.title
        }}<span v-if="props.stateLabel" class="m3-visually-hidden"
          >, {{ props.stateLabel }}</span
        ></span
      >
      <span v-if="props.supporting" class="m3-timeline-item__supporting">{{
        props.supporting
      }}</span>
      <span v-if="$slots.default" class="m3-timeline-item__extra"><slot /></span>
    </span>
  </li>
</template>

<style scoped>
.m3-timeline-item {
  --m3-timeline-marker: 24px;
  display: grid;
  grid-template-columns: 40px 1fr;
  column-gap: 12px;
}

.m3-timeline-item__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.m3-timeline-item__marker {
  display: grid;
  flex: none;
  place-items: center;
  box-sizing: border-box;
  width: var(--m3-timeline-marker);
  height: var(--m3-timeline-marker);
  margin-top: 8px;
  border: 2px solid var(--md-sys-color-outline);
  border-radius: 50%;
  color: var(--md-sys-color-on-primary);
}

.m3-timeline-item--done .m3-timeline-item__marker {
  border: 0;
  background: var(--md-sys-color-primary);
}

.m3-timeline-item__marker :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.m3-timeline-item__current {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.m3-timeline-item__current :deep(svg) {
  width: 20px;
  height: 20px;
}

.m3-timeline-item__pip {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--md-sys-color-primary);
}

.m3-timeline-item__line {
  flex: 1;
  width: 2px;
  min-height: 16px;
  margin: 4px 0;
  border-radius: 1px;
  background: var(--md-sys-color-outline-variant);
}

.m3-timeline-item--done .m3-timeline-item__line {
  background: var(--md-sys-color-primary);
}

.m3-timeline-item:last-child .m3-timeline-item__line {
  visibility: hidden;
}

.m3-timeline-item__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 8px 0 24px;
}

.m3-timeline-item--current .m3-timeline-item__body {
  padding-top: 0;
  min-height: 40px;
  justify-content: center;
}

.m3-timeline-item__time {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

.m3-timeline-item__title {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-timeline-item--current .m3-timeline-item__title {
  color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
    var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
}

.m3-timeline-item--upcoming .m3-timeline-item__title {
  color: var(--md-sys-color-on-surface-variant);
}

.m3-timeline-item__supporting {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-timeline-item__extra {
  display: block;
  margin-top: 8px;
}
</style>
