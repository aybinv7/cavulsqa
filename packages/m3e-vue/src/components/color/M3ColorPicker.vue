<script setup lang="ts">
import ColorChannel from "./ColorChannel.vue";
import M3TextField from "../textfield/M3TextField.vue";
import { expandHex, hctToHex, hexToHct, maxChroma, type HctColor } from "@cavulsqa/m3e";
import { computed, shallowRef, watch } from "vue";

/**
 * A colour picker in HCT - hue, chroma, tone - the space Material builds its schemes in, so a tone
 * picked here is the tone the scheme will use and a hue stays put while tone or chroma move. Each
 * channel's track shows what moving it will do; chroma beyond what a hue and tone can show gives
 * the most there is. The hex field takes `#rgb` or `#rrggbb`; `swatches` offers presets.
 * `v-model` is `#rrggbb`.
 */
const props = withDefaults(
  defineProps<{
    label?: string;
    swatches?: readonly string[];
    hueLabel?: string;
    chromaLabel?: string;
    toneLabel?: string;
    hexLabel?: string;
    invalidText?: string;
    swatchLabel?: (hex: string) => string;
  }>(),
  {
    label: "Colour",
    swatches: () => [],
    hueLabel: "Hue",
    chromaLabel: "Chroma",
    toneLabel: "Tone",
    hexLabel: "Hex",
    invalidText: "Enter 3 or 6 hex digits",
    swatchLabel: (hex: string) => hex,
  },
);

const model = defineModel<string>({ default: "#6750a4" });

const CHROMA_MAX = 150;
const HUE_STOPS = Array.from({ length: 13 }, (_, index) => index * 30);
const TONE_STOPS = Array.from({ length: 11 }, (_, index) => index * 10);
const CHROMA_STOPS = Array.from({ length: 9 }, (_, index) => (index * CHROMA_MAX) / 8);

const color = shallowRef<HctColor>(parse(model.value) ?? { hue: 282, chroma: 48, tone: 40 });
const draft = shallowRef(model.value.replace(/^#/, ""));
const invalid = shallowRef(false);
let emitted = model.value;

function parse(hex: string): HctColor | null {
  try {
    return hexToHct(hex);
  } catch {
    return null;
  }
}

const hex = computed(() => hctToHex(color.value));
const gradient = (stops: string[]) => `linear-gradient(to right, ${stops.join(", ")})`;

const hueTrack = computed(() =>
  gradient(
    HUE_STOPS.map((hue) =>
      hctToHex({ ...color.value, hue, chroma: Math.max(color.value.chroma, 24) }),
    ),
  ),
);
const chromaTrack = computed(() =>
  gradient(CHROMA_STOPS.map((chroma) => hctToHex({ ...color.value, chroma }))),
);
const toneTrack = computed(() =>
  gradient(TONE_STOPS.map((tone) => hctToHex({ ...color.value, tone }))),
);
const reachable = computed(() =>
  Math.round(Math.min(color.value.chroma, maxChroma(color.value.hue, color.value.tone))),
);

function update(patch: Partial<HctColor>) {
  color.value = { ...color.value, ...patch };
  emitted = hex.value;
  draft.value = emitted.slice(1);
  invalid.value = false;
  if (model.value !== emitted) model.value = emitted;
}

function commitDraft() {
  try {
    const value = expandHex(draft.value);
    invalid.value = false;
    color.value = hexToHct(value);
    emitted = value;
    draft.value = value.slice(1);
    if (model.value !== value) model.value = value;
  } catch {
    invalid.value = true;
  }
}

function pick(swatch: string) {
  const parsed = parse(swatch);
  if (!parsed) return;
  color.value = parsed;
  emitted = hctToHex(parsed);
  draft.value = emitted.slice(1);
  invalid.value = false;
  if (model.value !== emitted) model.value = emitted;
}

watch(model, (value) => {
  if (value === emitted) return;
  const parsed = parse(value);
  if (!parsed) return;
  color.value = parsed;
  emitted = value;
  draft.value = value.replace(/^#/, "");
  invalid.value = false;
});
</script>

<template>
  <div class="m3-color-picker" role="group" :aria-label="props.label">
    <div class="m3-color-picker__head">
      <span class="m3-color-picker__preview" :style="{ background: hex }" aria-hidden="true" />
      <M3TextField
        v-model="draft"
        class="m3-color-picker__hex"
        :label="props.hexLabel"
        prefix="#"
        :error="invalid ? props.invalidText : undefined"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        enterkeyhint="done"
        @change="commitDraft"
        @keydown.enter.prevent="commitDraft"
      />
    </div>
    <ColorChannel
      :label="props.hueLabel"
      :value="color.hue"
      :min="0"
      :max="360"
      :step="1"
      :gradient="hueTrack"
      :thumb="hex"
      :value-text="`${Math.round(color.hue)}°`"
      @change="(hue) => update({ hue })"
    />
    <ColorChannel
      :label="props.chromaLabel"
      :value="color.chroma"
      :min="0"
      :max="CHROMA_MAX"
      :step="1"
      :gradient="chromaTrack"
      :thumb="hex"
      :value-text="String(reachable)"
      @change="(chroma) => update({ chroma })"
    />
    <ColorChannel
      :label="props.toneLabel"
      :value="color.tone"
      :min="0"
      :max="100"
      :step="1"
      :gradient="toneTrack"
      :thumb="hex"
      :value-text="String(Math.round(color.tone))"
      @change="(tone) => update({ tone })"
    />
    <div
      v-if="props.swatches.length"
      class="m3-color-picker__swatches"
      role="radiogroup"
      :aria-label="props.label"
    >
      <button
        v-for="swatch in props.swatches"
        :key="swatch"
        type="button"
        role="radio"
        class="m3-color-picker__swatch m3-focus-ring"
        :aria-checked="swatch.toLowerCase() === hex"
        :aria-label="props.swatchLabel(swatch)"
        :style="{ background: swatch }"
        @click="pick(swatch)"
      />
    </div>
  </div>
</template>

<style scoped>
.m3-color-picker {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.m3-color-picker__head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.m3-color-picker__preview {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: var(--md-sys-shape-corner-large, 16px);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-outline) 40%, transparent);
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-color-picker__hex {
  flex: 1;
  min-width: 0;
}

.m3-color-picker__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.m3-color-picker__swatch {
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-outline) 40%, transparent);
  cursor: pointer;
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration)
    var(--md-sys-motion-spring-fast-spatial);
}

.m3-color-picker__swatch[aria-checked="true"] {
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  outline: 3px solid var(--md-sys-color-on-surface);
  outline-offset: 2px;
}
</style>
