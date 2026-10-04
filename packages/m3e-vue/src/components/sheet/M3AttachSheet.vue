<script setup lang="ts">
import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { AttachOption } from "./attach.js";
import M3BottomSheet from "./M3BottomSheet.vue";
import M3Shape from "../shape/M3Shape.vue";
import { vRipple } from "../../directives/ripple.js";
import { useHaptics } from "../../composables/services.js";

/**
 * What a composer's "+" opens, as in Google Messages and WhatsApp: a sheet of ways to send
 * something - gallery, camera, file, location, contact - each a tinted icon on its own expressive
 * shape, springing in one after another. `#recent` sits above the grid, for a strip of recent
 * photos to send in one tap. Choosing closes the sheet and emits `select`.
 *
 * @see https://m3.material.io/components/bottom-sheets/guidelines
 */
const props = withDefaults(
  defineProps<{
    options: readonly AttachOption[];
    label: string;
    title?: string;
    teleport?: string | HTMLElement;
  }>(),
  { teleport: "body" },
);

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ select: [id: string] }>();
defineSlots<{ recent?: () => unknown }>();

const SHAPES: readonly MaterialShapeName[] = [
  "cookie9Sided",
  "clover4Leaf",
  "sunny",
  "gem",
  "softBurst",
  "pentagon",
  "puffy",
  "flower",
];
const TONES = ["primary", "secondary", "tertiary"] as const;

const haptics = useHaptics();

function choose(id: string) {
  haptics.tick();
  open.value = false;
  emit("select", id);
}
</script>

<template>
  <M3BottomSheet
    v-model:open="open"
    :title="props.title"
    :label="props.label"
    :teleport="props.teleport"
  >
    <div class="m3-attach-sheet">
      <slot name="recent" />
      <ul class="m3-attach-sheet__grid" role="list">
        <li
          v-for="(option, index) in props.options"
          :key="option.id"
          class="m3-attach-sheet__cell"
          :style="{ '--m3-attach-index': index }"
        >
          <button
            v-ripple
            type="button"
            class="m3-attach-sheet__option m3-focus-ring"
            :class="`m3-attach-sheet__option--${option.tone ?? TONES[index % TONES.length]}`"
            @click="choose(option.id)"
          >
            <span class="m3-attach-sheet__badge" aria-hidden="true">
              <M3Shape
                :shape="option.shape ?? SHAPES[index % SHAPES.length]!"
                class="m3-attach-sheet__shape"
              />
              <component :is="option.icon" class="m3-attach-sheet__icon" />
            </span>
            <span class="m3-attach-sheet__label">{{ option.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </M3BottomSheet>
</template>

<style scoped>
.m3-attach-sheet {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 16px 24px;
}

.m3-attach-sheet__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.m3-attach-sheet__option {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  overflow: hidden;
  border: 0;
  border-radius: var(--md-sys-shape-corner-large);
  background: none;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
}

.m3-attach-sheet__badge {
  position: relative;
  display: grid;
  width: 60px;
  height: 60px;
  place-items: center;
}

.m3-attach-sheet__shape {
  position: absolute;
  inset: 0;
  background: var(--m3-attach-container);
  transition:
    rotate var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    scale var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}

.m3-attach-sheet__option:active .m3-attach-sheet__shape {
  rotate: 30deg;
  scale: 0.9;
}

.m3-attach-sheet__icon {
  position: relative;
  width: 28px;
  height: 28px;
  color: var(--m3-attach-content);
}

.m3-attach-sheet__option--primary {
  --m3-attach-container: var(--md-sys-color-primary-container);
  --m3-attach-content: var(--md-sys-color-on-primary-container);
}

.m3-attach-sheet__option--secondary {
  --m3-attach-container: var(--md-sys-color-secondary-container);
  --m3-attach-content: var(--md-sys-color-on-secondary-container);
}

.m3-attach-sheet__option--tertiary {
  --m3-attach-container: var(--md-sys-color-tertiary-container);
  --m3-attach-content: var(--md-sys-color-on-tertiary-container);
}

.m3-attach-sheet__label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
}

@media (prefers-reduced-motion: no-preference) {
  .m3-attach-sheet__cell {
    animation: m3-attach-in 460ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(80ms + var(--m3-attach-index) * 28ms);
  }
}

@keyframes m3-attach-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.6);
  }
}
</style>
