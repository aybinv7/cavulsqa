import { DynamicScheme, Hct, Variant, argbFromHex } from "@material/material-color-utilities";

export type SpecVersion = "2021" | "2025";
export type Platform = "phone" | "watch";

/**
 * The scheme variants. `brand` is Theme Builder's "Match color": Fidelity's primary palette, so the
 * seed itself is `primaryContainer` in both modes, with Tonal Spot's calmer secondary, tertiary and
 * neutral palettes around it.
 *
 * @see https://m3.material.io/styles/color/choosing-a-scheme
 */
export type SchemeVariant =
  | "tonalSpot"
  | "neutral"
  | "vibrant"
  | "expressive"
  | "fidelity"
  | "content"
  | "monochrome"
  | "rainbow"
  | "fruitSalad"
  | "brand";

export const SCHEME_VARIANTS: readonly SchemeVariant[] = [
  "brand",
  "tonalSpot",
  "expressive",
  "vibrant",
  "neutral",
  "fidelity",
  "content",
  "monochrome",
  "rainbow",
  "fruitSalad",
];

/** Contrast stops M3 names; any value from -1 to 1 is valid. */
export const CONTRAST = { reduced: -1, standard: 0, medium: 0.5, high: 1 } as const;

/**
 * Schemes are built from `DynamicScheme` and the `Variant` enum rather than the `Scheme*` classes:
 * in 0.4.0 those classes' declarations import `dynamic_scheme` without an extension, so under
 * `nodenext` they lose every inherited member. The classes only forward their variant, so this is
 * the same scheme.
 */
const VARIANTS: Record<Exclude<SchemeVariant, "brand">, Variant> = {
  tonalSpot: Variant.TONAL_SPOT,
  neutral: Variant.NEUTRAL,
  vibrant: Variant.VIBRANT,
  expressive: Variant.EXPRESSIVE,
  fidelity: Variant.FIDELITY,
  content: Variant.CONTENT,
  monochrome: Variant.MONOCHROME,
  rainbow: Variant.RAINBOW,
  fruitSalad: Variant.FRUIT_SALAD,
};

const SPEC_2025: ReadonlySet<SchemeVariant> = new Set([
  "tonalSpot",
  "neutral",
  "vibrant",
  "expressive",
]);

/**
 * The spec a variant is actually generated with. material-color-utilities applies the 2025
 * (Expressive) rules only to Tonal Spot, Neutral, Vibrant and Expressive, and silently falls back
 * to 2021 for every other variant - including `brand`, whose primary is Fidelity's.
 */
export function effectiveSpec(
  variant: SchemeVariant,
  requested: SpecVersion = "2025",
): SpecVersion {
  return SPEC_2025.has(variant) ? requested : "2021";
}

const HEX = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export class InvalidSeedError extends Error {
  constructor(readonly seed: string) {
    super(`"${seed}" is not a hex colour (#rgb or #rrggbb)`);
    this.name = "InvalidSeedError";
  }
}

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export function seedArgb(seed: string): number {
  if (!isHexColor(seed)) throw new InvalidSeedError(seed);
  const hex = seed.replace("#", "");
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  return argbFromHex(full);
}

export interface SchemeOptions {
  seed: string;
  isDark: boolean;
  variant?: SchemeVariant;
  /** From -1 (reduced) through 0 (standard) to 1 (high). */
  contrast?: number;
  spec?: SpecVersion;
  platform?: Platform;
}

export function createScheme({
  seed,
  isDark,
  variant = "tonalSpot",
  contrast = 0,
  spec = "2025",
  platform = "phone",
}: SchemeOptions): DynamicScheme {
  const source = Hct.fromInt(seedArgb(seed));
  const level = Math.min(1, Math.max(-1, contrast));
  const base = {
    sourceColorHct: source,
    contrastLevel: level,
    isDark,
    platform,
    specVersion: spec,
  };
  if (variant !== "brand") return new DynamicScheme({ ...base, variant: VARIANTS[variant] });

  const fidelity = new DynamicScheme({ ...base, variant: Variant.FIDELITY });
  const tonal = new DynamicScheme({ ...base, variant: Variant.TONAL_SPOT });
  return new DynamicScheme({
    sourceColorHct: source,
    variant: Variant.FIDELITY,
    contrastLevel: level,
    isDark,
    platform,
    specVersion: spec,
    primaryPalette: fidelity.primaryPalette,
    secondaryPalette: tonal.secondaryPalette,
    tertiaryPalette: tonal.tertiaryPalette,
    neutralPalette: tonal.neutralPalette,
    neutralVariantPalette: tonal.neutralVariantPalette,
  });
}
