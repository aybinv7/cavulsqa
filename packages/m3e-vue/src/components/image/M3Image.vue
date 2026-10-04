<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";

/**
 * Framework7's lazy image, on the platform's own lazy loading: it reserves its space from
 * `width` and `height` (or `ratio`) so nothing below it jumps, shows `placeholder` - a colour, or a
 * tiny image drawn blurred - until the picture is decoded, then fades it in. A picture already in
 * the cache appears at once. A failed one shows `#error` (an icon by default) and still carries
 * `alt`. Pass `eager` for an image on the first screen.
 */
const props = withDefaults(
  defineProps<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
    ratio?: string;
    fit?: "cover" | "contain";
    placeholder?: string;
    eager?: boolean;
    srcset?: string;
    sizes?: string;
  }>(),
  { fit: "cover", eager: false },
);

const emit = defineEmits<{ load: [event: Event]; error: [event: Event] }>();

type State = "loading" | "loaded" | "error";
const image = useTemplateRef<HTMLImageElement>("image");
const state = shallowRef<State>("loading");
const instant = shallowRef(false);

const ratio = computed(
  () =>
    props.ratio ?? (props.width && props.height ? `${props.width} / ${props.height}` : undefined),
);
const pictured = computed(
  () => !!props.placeholder && /^(data:|https?:|\/|\.)/.test(props.placeholder),
);
const style = computed(() => ({
  aspectRatio: ratio.value,
  "--m3-image-placeholder": pictured.value ? `url("${props.placeholder}")` : undefined,
  backgroundColor: !pictured.value ? props.placeholder : undefined,
}));

function onLoad(event: Event) {
  state.value = "loaded";
  emit("load", event);
}

function onError(event: Event) {
  state.value = "error";
  emit("error", event);
}

watch(
  () => props.src,
  () => {
    state.value = "loading";
    instant.value = false;
  },
);

onMounted(() => {
  const element = image.value;
  if (element?.complete && element.naturalWidth > 0) {
    instant.value = true;
    state.value = "loaded";
  }
});
</script>

<template>
  <span
    class="m3-image"
    :class="[
      `m3-image--${state}`,
      {
        'm3-image--instant': instant,
        'm3-image--pictured': pictured,
        'm3-image--contain': props.fit === 'contain',
      },
    ]"
    :style="style"
  >
    <img
      v-if="state !== 'error'"
      ref="image"
      class="m3-image__img"
      :src="props.src"
      :srcset="props.srcset"
      :sizes="props.sizes"
      :alt="props.alt"
      :width="props.width"
      :height="props.height"
      :loading="props.eager ? 'eager' : 'lazy'"
      :fetchpriority="props.eager ? 'high' : 'auto'"
      decoding="async"
      @load="onLoad"
      @error="onError"
    />
    <span
      v-else
      class="m3-image__error"
      :role="props.alt ? 'img' : undefined"
      :aria-label="props.alt || undefined"
    >
      <slot name="error"><M3Glyph name="imageOff" /></slot>
    </span>
  </span>
</template>

<style scoped>
.m3-image {
  position: relative;
  display: block;
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container-highest);
}

.m3-image--pictured::before {
  content: "";
  position: absolute;
  inset: -12px;
  background: var(--m3-image-placeholder) center / cover no-repeat;
  filter: blur(12px);
}

.m3-image__img {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
}

.m3-image--contain .m3-image__img {
  object-fit: contain;
}

.m3-image--loaded .m3-image__img {
  opacity: 1;
}

.m3-image--instant .m3-image__img {
  transition: none;
}

.m3-image__error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 48px;
  color: var(--md-sys-color-on-surface-variant);
}

@media (prefers-reduced-motion: reduce) {
  .m3-image__img {
    transition: none;
  }
}
</style>
