<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed } from "vue";
import type { MessageLocation } from "../../utils/messages.js";

/**
 * A shared place: a drawn street grid with a pin - no map tiles, so it renders offline - the
 * place's name and its coordinates. A tap emits `open`, for the app to hand it to a maps app.
 */
const props = defineProps<{ location: MessageLocation; label: string }>();
const emit = defineEmits<{ open: [] }>();

const coordinates = computed(
  () => `${props.location.lat.toFixed(5)}, ${props.location.lng.toFixed(5)}`,
);
</script>

<template>
  <button
    type="button"
    class="m3-chat-location m3-state m3-focus-ring"
    :aria-label="`${props.label}: ${props.location.label ?? coordinates}`"
    @click.stop="emit('open')"
  >
    <span class="m3-chat-location__map" aria-hidden="true">
      <span class="m3-chat-location__pin"><M3Glyph name="locationOn" :size="28" /></span>
    </span>
    <span class="m3-chat-location__text">
      <span v-if="props.location.label" class="m3-chat-location__title"
        ><span dir="auto">{{ props.location.label }}</span></span
      >
      <span class="m3-chat-location__coords" dir="ltr">{{ coordinates }}</span>
    </span>
  </button>
</template>

<style scoped>
.m3-chat-location {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: none;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.m3-chat-location__map {
  position: relative;
  display: grid;
  height: 120px;
  place-items: center;
  background:
    linear-gradient(
      120deg,
      transparent 46%,
      var(--m3-chat-location-road, var(--md-sys-color-surface-container-lowest)) 46% 52%,
      transparent 52%
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0 26px,
      color-mix(in srgb, var(--md-sys-color-outline-variant) 70%, transparent) 26px 28px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 34px,
      color-mix(in srgb, var(--md-sys-color-outline-variant) 70%, transparent) 34px 36px
    ),
    var(--md-sys-color-surface-container-highest);
}

@supports (color: light-dark(white, black)) {
  .m3-chat-location__map {
    --m3-chat-location-road: light-dark(
      var(--md-sys-color-surface-container-lowest),
      color-mix(
        in srgb,
        var(--md-sys-color-outline) 70%,
        var(--md-sys-color-surface-container-highest)
      )
    );
  }
}

.m3-chat-location__pin {
  position: relative;
  display: grid;
  margin-top: -14px;
  place-items: center;
  color: var(--md-sys-color-tertiary);
  filter: drop-shadow(0 2px 3px color-mix(in srgb, var(--md-sys-color-shadow) 35%, transparent));
}

.m3-chat-location__pin::after {
  content: "";
  position: absolute;
  bottom: -6px;
  width: 10px;
  height: 4px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--md-sys-color-tertiary) 45%, transparent);
}

.m3-chat-location__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px 12px;
}

.m3-chat-location__title {
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-chat-location__coords {
  opacity: 0.8;
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
  font-variant-numeric: tabular-nums;
}
</style>
