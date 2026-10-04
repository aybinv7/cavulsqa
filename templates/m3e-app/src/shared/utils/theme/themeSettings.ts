import { CONTRAST, SCHEME_VARIANTS, isHexColor, type SchemeVariant } from "@cavulsqa/m3e";
import { BRAND_SEED, DEFAULT_VARIANT } from "@/app/theme.config";

export type ContrastChoice = "standard" | "medium" | "high";
export type ModeChoice = "system" | "light" | "dark";
export type MotionChoice = "system" | "reduced" | "full";

export interface ThemeSettings {
  seed: string;
  variant: SchemeVariant;
  contrast: ContrastChoice;
  mode: ModeChoice;
  motion: MotionChoice;
}

export const DEFAULT_THEME: Readonly<ThemeSettings> = {
  seed: BRAND_SEED,
  variant: DEFAULT_VARIANT,
  contrast: "standard",
  mode: "system",
  motion: "system",
};

export const CONTRAST_LEVELS: Readonly<Record<ContrastChoice, number>> = {
  standard: CONTRAST.standard,
  medium: CONTRAST.medium,
  high: CONTRAST.high,
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

/**
 * Settings read back from storage are untrusted text: an older build, a hand-edited value, a
 * variant this build no longer offers. Every field is checked and falls back on its own, so one
 * bad value never costs the user the rest of their choices.
 */
export function parseThemeSettings(raw: unknown): ThemeSettings {
  const value = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    seed:
      typeof value.seed === "string" && isHexColor(value.seed) ? value.seed : DEFAULT_THEME.seed,
    variant: oneOf(value.variant, SCHEME_VARIANTS, DEFAULT_THEME.variant),
    contrast: oneOf(
      value.contrast,
      ["standard", "medium", "high"] as const,
      DEFAULT_THEME.contrast,
    ),
    mode: oneOf(value.mode, ["system", "light", "dark"] as const, DEFAULT_THEME.mode),
    motion: oneOf(value.motion, ["system", "reduced", "full"] as const, DEFAULT_THEME.motion),
  };
}

export function reducedMotionOverride(motion: MotionChoice): boolean | null {
  if (motion === "system") return null;
  return motion === "reduced";
}
