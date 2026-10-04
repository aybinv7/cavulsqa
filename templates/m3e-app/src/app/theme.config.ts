import type { SchemeVariant } from "@cavulsqa/m3e";

/**
 * The brand, as data. Every colour on screen is generated from `seed` by Material's 2025 colour
 * system; nothing else in the app is allowed to name a hex value. Change the seed here and the
 * whole app - light, dark, every contrast level - follows.
 */
export const BRAND_SEED = "#c96442";

export const DEFAULT_VARIANT: SchemeVariant = "tonalSpot";

/**
 * Custom colour groups beyond the M3 roles, each published as `X`, `on-X`, `X-container` and
 * `on-X-container`. Harmonised toward the seed so they belong to the same palette.
 */
export const EXTRA_COLORS = {
  success: "#1c7a4a",
  warning: "#c08a2e",
} as const;

export interface SeedPreset {
  id: string;
  seed: string;
  labelKey: string;
}

/** The colour studio's swatches, spread around the hue wheel. The first is the brand. */
export const SEED_PRESETS: readonly SeedPreset[] = [
  { id: "brand", seed: BRAND_SEED, labelKey: "studio.presets.brand" },
  { id: "red", seed: "#d32f2f", labelKey: "studio.presets.red" },
  { id: "amber", seed: "#c08a2e", labelKey: "studio.presets.amber" },
  { id: "green", seed: "#2e7d32", labelKey: "studio.presets.green" },
  { id: "teal", seed: "#00796b", labelKey: "studio.presets.teal" },
  { id: "blue", seed: "#2f6fd6", labelKey: "studio.presets.blue" },
  { id: "indigo", seed: "#4f5bd5", labelKey: "studio.presets.indigo" },
  { id: "violet", seed: "#7b4fd0", labelKey: "studio.presets.violet" },
  { id: "pink", seed: "#c2185b", labelKey: "studio.presets.pink" },
  { id: "slate", seed: "#546e7a", labelKey: "studio.presets.slate" },
];

/** The variants the studio offers, in the order M3 recommends them. */
export const STUDIO_VARIANTS: readonly SchemeVariant[] = [
  "tonalSpot",
  "expressive",
  "vibrant",
  "brand",
  "neutral",
  "monochrome",
];

export const TYPEFACE = `"Google Sans Flex Variable", "Google Sans Flex", Roboto, "Noto Sans", "Noto Sans Arabic", system-ui, sans-serif`;
