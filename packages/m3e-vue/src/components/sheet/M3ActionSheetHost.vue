<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import type { MaterialShapeName } from "@cavulsqa/m3e";
import { shallowRef, watch } from "vue";
import M3BottomSheet from "./M3BottomSheet.vue";
import M3List from "../list/M3List.vue";
import M3ListItem from "../list/M3ListItem.vue";
import M3Shape from "../shape/M3Shape.vue";
import { useM3eConfig } from "../../services/config.js";
import type { ActionSheetRequest } from "../../services/actionSheet.js";
import { vRipple } from "../../directives/ripple.js";

/**
 * Renders the requests of `useActionSheet().open(...)`: an optional title, a row of shaped quick
 * actions, then groups of options as segmented lists. Mount it once, near the app root. The
 * request stays on screen through the closing animation even after its promise has resolved.
 */
const { actionSheet } = useM3eConfig();
const open = shallowRef(false);
const request = shallowRef<ActionSheetRequest | null>(null);
const QUICK_SHAPES: readonly MaterialShapeName[] = [
  "cookie9Sided",
  "clover4Leaf",
  "pentagon",
  "cookie6Sided",
  "sunny",
];

watch(
  actionSheet.current,
  (current) => {
    if (current) {
      request.value = current;
      open.value = true;
    } else {
      open.value = false;
    }
  },
  { immediate: true },
);

watch(open, (value) => {
  if (!value && request.value && actionSheet.current.value === request.value)
    actionSheet.settle(null);
});

function choose(id: string) {
  actionSheet.settle(id);
}
</script>

<template>
  <M3BottomSheet
    v-model:open="open"
    :title="request?.title"
    :label="request?.title ?? 'Options'"
    @closed="request = null"
  >
    <template v-if="request?.supporting" #header>
      <h2 class="m3-action-sheet__title">{{ request.title }}</h2>
      <p class="m3-action-sheet__supporting">{{ request.supporting }}</p>
    </template>
    <div v-if="request" class="m3-action-sheet">
      <div v-if="request.quickActions?.length" class="m3-action-sheet__quick">
        <button
          v-for="(item, index) in request.quickActions"
          :key="item.id"
          v-ripple
          type="button"
          class="m3-action-sheet__quick-action m3-state m3-focus-ring"
          :disabled="item.disabled"
          @click="choose(item.id)"
        >
          <M3Shape
            class="m3-action-sheet__quick-shape"
            :shape="QUICK_SHAPES[index % QUICK_SHAPES.length]!"
          >
            <component :is="item.icon" v-if="item.icon" aria-hidden="true" />
          </M3Shape>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <section
        v-for="(group, groupIndex) in request.groups"
        :key="groupIndex"
        class="m3-action-sheet__group"
      >
        <h3 v-if="group.label" class="m3-action-sheet__group-label">{{ group.label }}</h3>
        <M3List variant="segmented" inset :label="group.label">
          <M3ListItem
            v-for="item in group.items"
            :key="item.id"
            clickable
            :headline="item.label"
            :supporting="item.supporting"
            :selected="item.selected"
            :disabled="item.disabled"
            :tone="item.tone"
            @click="choose(item.id)"
          >
            <template v-if="item.icon" #leading
              ><component :is="item.icon" aria-hidden="true"
            /></template>
            <template v-if="item.selected" #trailing>
              <M3Glyph name="check" />
            </template>
          </M3ListItem>
        </M3List>
      </section>
    </div>
  </M3BottomSheet>
</template>

<style scoped>
.m3-action-sheet__title {
  margin: 0;
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) /
    var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
}

.m3-action-sheet__supporting {
  margin: 4px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-action-sheet {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.m3-action-sheet__quick {
  display: flex;
  gap: 8px;
  padding: 0 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.m3-action-sheet__quick-action {
  display: flex;
  flex: 1 0 72px;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 96px;
  padding: 4px 0;
  border: 0;
  border-radius: 16px;
  background: none;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
  text-align: center;
  cursor: pointer;
}

.m3-action-sheet__quick-shape {
  width: 56px;
  height: 56px;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-size: 24px;
  transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-action-sheet__quick-shape :deep(svg) {
  width: 24px;
  height: 24px;
}

.m3-action-sheet__quick-action[data-pressed] .m3-action-sheet__quick-shape {
  transform: scale(0.9) rotate(-12deg);
}

.m3-action-sheet__group-label {
  margin: 0;
  padding: 0 24px 8px;
  color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}
</style>
