<script setup lang="ts" generic="T extends { label: string; href?: string }">
import M3Glyph from "../icon/M3Glyph.vue";
import M3Menu from "../menu/M3Menu.vue";
import M3MenuItem from "../menu/M3MenuItem.vue";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";

/**
 * Framework7's breadcrumbs: where a screen sits in a hierarchy - a catalogue's family, category and
 * product, a folder path - with each level a way back up. The last item is the current one and is
 * not a link. Past `max` items the middle collapses into one "more" button that lists the hidden
 * levels in a menu, so the first and the nearest levels always show. Items with `href` render as
 * links; otherwise choosing one emits `select`.
 */
const props = withDefaults(
  defineProps<{
    items: readonly T[];
    label?: string;
    max?: number;
    moreLabel?: string;
  }>(),
  { label: "Breadcrumbs", max: 4, moreLabel: "Show hidden levels" },
);

const emit = defineEmits<{ select: [item: T, index: number] }>();

const nav = useTemplateRef<HTMLElement>("nav");
const more = useTemplateRef<HTMLElement>("more");
const menuOpen = shallowRef(false);

const collapsed = computed(() => props.items.length > Math.max(2, props.max));
const tail = computed(() => Math.max(1, Math.max(2, props.max) - 1));
const hidden = computed(() =>
  collapsed.value
    ? props.items
        .slice(1, props.items.length - tail.value)
        .map((item, offset) => ({ item, index: offset + 1 }))
    : [],
);
const entries = computed(() => props.items.map((item, index) => ({ item, index })));
const leading = computed(() => (collapsed.value ? entries.value.slice(0, 1) : entries.value));
const trailing = computed(() =>
  collapsed.value ? entries.value.slice(entries.value.length - tail.value) : [],
);

const fadeLeft = shallowRef(false);
const fadeRight = shallowRef(false);

function measureEdges() {
  const element = nav.value;
  if (!element) return;
  const hiddenAfter = element.scrollWidth - element.clientWidth - Math.abs(element.scrollLeft) > 1;
  const hiddenBefore = Math.abs(element.scrollLeft) > 1;
  const rtl = getComputedStyle(element).direction === "rtl";
  fadeLeft.value = rtl ? hiddenAfter : hiddenBefore;
  fadeRight.value = rtl ? hiddenBefore : hiddenAfter;
}

function revealCurrent() {
  const element = nav.value;
  if (!element) return;
  if (element.scrollWidth > element.clientWidth) {
    const rtl = getComputedStyle(element).direction === "rtl";
    element.scrollLeft = rtl ? -element.scrollWidth : element.scrollWidth;
  }
  measureEdges();
}

watch(() => props.items.length, revealCurrent, { flush: "post" });
onMounted(revealCurrent);

function choose(item: T, index: number, event?: MouseEvent) {
  if (index === props.items.length - 1) return;
  if (!item.href) event?.preventDefault();
  emit("select", item, index);
}
</script>

<template>
  <nav
    ref="nav"
    class="m3-breadcrumbs"
    :style="{
      '--m3-fade-left': fadeLeft ? '24px' : '0px',
      '--m3-fade-right': fadeRight ? '24px' : '0px',
    }"
    :aria-label="props.label"
    @scroll.passive="measureEdges"
  >
    <ol class="m3-breadcrumbs__list">
      <li v-for="entry in leading" :key="entry.index" class="m3-breadcrumbs__item">
        <M3Glyph
          v-if="entry.index > 0"
          name="chevronRight"
          :size="18"
          class="m3-breadcrumbs__separator"
        />
        <span
          v-if="entry.index === props.items.length - 1"
          class="m3-breadcrumbs__crumb m3-breadcrumbs__crumb--current"
          aria-current="page"
          >{{ entry.item.label }}</span
        >
        <component
          :is="entry.item.href ? 'a' : 'button'"
          v-else
          :href="entry.item.href"
          :type="entry.item.href ? undefined : 'button'"
          class="m3-breadcrumbs__crumb m3-state m3-focus-ring"
          @click="choose(entry.item, entry.index, $event)"
        >
          {{ entry.item.label }}
        </component>
      </li>
      <li v-if="collapsed" class="m3-breadcrumbs__item">
        <M3Glyph name="chevronRight" :size="18" class="m3-breadcrumbs__separator" />
        <span ref="more" class="m3-breadcrumbs__more-anchor">
          <button
            type="button"
            class="m3-breadcrumbs__crumb m3-breadcrumbs__more m3-state m3-focus-ring"
            :aria-label="props.moreLabel"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            @click="menuOpen = !menuOpen"
          >
            …
          </button>
        </span>
      </li>
      <li v-for="entry in trailing" :key="entry.index" class="m3-breadcrumbs__item">
        <M3Glyph name="chevronRight" :size="18" class="m3-breadcrumbs__separator" />
        <span
          v-if="entry.index === props.items.length - 1"
          class="m3-breadcrumbs__crumb m3-breadcrumbs__crumb--current"
          aria-current="page"
          >{{ entry.item.label }}</span
        >
        <component
          :is="entry.item.href ? 'a' : 'button'"
          v-else
          :href="entry.item.href"
          :type="entry.item.href ? undefined : 'button'"
          class="m3-breadcrumbs__crumb m3-state m3-focus-ring"
          @click="choose(entry.item, entry.index, $event)"
        >
          {{ entry.item.label }}
        </component>
      </li>
    </ol>
    <M3Menu v-if="collapsed" v-model:open="menuOpen" :anchor="more" :label="props.moreLabel">
      <M3MenuItem
        v-for="entry in hidden"
        :key="entry.index"
        :label="entry.item.label"
        @select="choose(entry.item, entry.index)"
      />
    </M3Menu>
  </nav>
</template>

<style scoped>
.m3-breadcrumbs {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  --m3-fade: linear-gradient(
    to right,
    transparent,
    #000 var(--m3-fade-left),
    #000 calc(100% - var(--m3-fade-right)),
    transparent
  );
  -webkit-mask-image: var(--m3-fade);
  mask-image: var(--m3-fade);
}

.m3-breadcrumbs::-webkit-scrollbar {
  display: none;
}

.m3-breadcrumbs__list {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
  white-space: nowrap;
}

.m3-breadcrumbs__item {
  display: inline-flex;
  flex: none;
  align-items: center;
}

.m3-breadcrumbs__separator {
  margin: 0 2px;
  color: var(--md-sys-color-on-surface-variant);
}

:global([dir="rtl"] .m3-breadcrumbs__separator) {
  transform: scaleX(-1);
}

.m3-breadcrumbs__more-anchor {
  display: inline-flex;
}

.m3-breadcrumbs__crumb {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: auto;
  min-height: 40px;
  margin: 0;
  padding: 0 8px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: none;
  color: var(--md-sys-color-on-surface-variant);
  text-decoration: none;
  cursor: pointer;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  -webkit-tap-highlight-color: transparent;
}

.m3-breadcrumbs__crumb--current {
  color: var(--md-sys-color-on-surface);
  cursor: default;
}

.m3-breadcrumbs__more {
  min-width: 40px;
  justify-content: center;
}
</style>
