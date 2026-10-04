import {
  createScheme,
  type Platform,
  type SchemeVariant,
  type SpecVersion,
} from "../color/scheme.js";
import { resolveExtras, resolveRoles } from "../color/roles.js";
import { cssCubicBezier } from "../motion/cubicBezier.js";
import { springEasing } from "../motion/spring.js";
import {
  DURATION,
  EASING,
  MOTION_SCHEMES,
  SPRING_TOKENS,
  type MotionSchemeName,
} from "../motion/tokens.js";
import { ELEVATION, elevationShadow, type ElevationLevel } from "./elevation.js";
import { CORNER } from "./shape.js";
import { STATE_LAYER } from "./state.js";
import { TYPESCALE } from "./typescale.js";

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const rem = (px: number) => `${Number((px / 16).toFixed(4))}rem`;
const block = (selector: string, declarations: Record<string, string>) =>
  `${selector}{${Object.entries(declarations)
    .map(([name, value]) => `${name}:${value};`)
    .join("")}}`;

export interface ColorStylesheetOptions {
  seed: string;
  variant?: SchemeVariant;
  contrast?: number;
  spec?: SpecVersion;
  platform?: Platform;
  /** Custom colour groups, e.g. `{ success: "#1c7a4a" }`, published with their on- and container roles. */
  extras?: Readonly<Record<string, string>>;
  harmonizeExtras?: boolean;
  /** Where the light roles are declared. */
  light?: string;
  /** Where the dark roles are declared; toggling dark mode is then one class, with no regeneration. */
  dark?: string;
}

/** Both colour modes as `--md-sys-color-*` declarations, ready for one `<style>` element. */
export function colorStylesheet(options: ColorStylesheetOptions): string {
  const { light = ":root", dark = ":root.dark", extras = {} } = options;
  const declarations = (isDark: boolean) => {
    const scheme = createScheme({ ...options, isDark });
    const colors: Record<string, string> = {
      ...resolveRoles(scheme),
      ...resolveExtras(options.seed, extras, {
        isDark,
        contrast: options.contrast,
        harmonize: options.harmonizeExtras,
      }),
    };
    const result: Record<string, string> = { "color-scheme": isDark ? "dark" : "light" };
    for (const [role, value] of Object.entries(colors)) result[`--md-sys-color-${role}`] = value;
    return result;
  };
  return block(light, declarations(false)) + block(dark, declarations(true));
}

export interface SystemStylesheetOptions {
  motion?: MotionSchemeName;
  /** Display face for display, headline and title-large styles. */
  brandTypeface?: string;
  /** Text face for every other style. */
  plainTypeface?: string;
  selector?: string;
}

const DEFAULT_TYPEFACE = `"Google Sans Flex", "Google Sans", Roboto, "Noto Sans", system-ui, sans-serif`;

/**
 * Languages written in a joined (cursive) script. Letter-spacing pulls their letters apart and
 * breaks the joins, so the type scale's tracking is zero for them, whatever the style.
 */
export const JOINED_SCRIPT_LANGUAGES = ["ar", "fa", "ur", "ps", "sd", "ug", "ckb", "syr"] as const;

/**
 * Every static M3 Expressive token as CSS custom properties: shape, type scale, motion, elevation
 * and state layers. Spatial springs become `linear()` curves that keep their overshoot; under
 * `prefers-reduced-motion` they collapse to 1 ms (never 0, which suppresses `transitionend`) while
 * effects - colour and opacity - keep their timing, since they carry meaning without travel.
 * Text in a joined script (`JOINED_SCRIPT_LANGUAGES`, by `lang`) gets zero tracking.
 */
export function systemStylesheet(options: SystemStylesheetOptions = {}): string {
  const selector = options.selector ?? ":root";
  const tokens: Record<string, string> = {
    "--md-ref-typeface-brand": options.brandTypeface ?? DEFAULT_TYPEFACE,
    "--md-ref-typeface-plain": options.plainTypeface ?? DEFAULT_TYPEFACE,
  };

  for (const [name, value] of Object.entries(CORNER))
    tokens[`--md-sys-shape-corner-${kebab(name)}`] = `${value}px`;

  for (const [name, style] of Object.entries(TYPESCALE)) {
    const prefix = `--md-sys-typescale-${kebab(name)}`;
    tokens[`${prefix}-font`] = `var(--md-ref-typeface-${style.face})`;
    tokens[`${prefix}-size`] = rem(style.size);
    tokens[`${prefix}-line-height`] = rem(style.lineHeight);
    tokens[`${prefix}-weight`] = String(style.weight);
    tokens[`${prefix}-tracking`] = rem(style.tracking);
    tokens[`--md-sys-typescale-emphasized-${kebab(name)}-weight`] = String(style.emphasizedWeight);
    tokens[`--md-sys-typescale-emphasized-${kebab(name)}-tracking`] = rem(style.emphasizedTracking);
  }

  const untracked: Record<string, string> = {};
  for (const name of Object.keys(TYPESCALE)) {
    untracked[`--md-sys-typescale-${kebab(name)}-tracking`] = "0";
    untracked[`--md-sys-typescale-emphasized-${kebab(name)}-tracking`] = "0";
  }
  const joined = JOINED_SCRIPT_LANGUAGES.flatMap((language) => [
    `${selector}:lang(${language})`,
    `[lang]:lang(${language})`,
  ]).join(",");

  const scheme = MOTION_SCHEMES[options.motion ?? "expressive"];
  const reduced: Record<string, string> = {};
  for (const name of SPRING_TOKENS) {
    const token = scheme[name];
    const prefix = `--md-sys-motion-spring-${kebab(name)}`;
    const spatial = name.endsWith("Spatial");
    tokens[prefix] = spatial
      ? springEasing(token.spring, token.durationMs)
      : cssCubicBezier(token.bezier);
    tokens[`${prefix}-duration`] = `${token.durationMs}ms`;
    if (spatial) {
      reduced[prefix] = cssCubicBezier(scheme.defaultEffects.bezier);
      reduced[`${prefix}-duration`] = "1ms";
    }
  }
  for (const [name, bezier] of Object.entries(EASING))
    tokens[`--md-sys-motion-easing-${kebab(name)}`] = cssCubicBezier(bezier);
  for (const [name, ms] of Object.entries(DURATION))
    tokens[`--md-sys-motion-duration-${kebab(name)}`] = `${ms}ms`;

  ELEVATION.forEach((_, level) => {
    tokens[`--md-sys-elevation-level${level}`] = elevationShadow(level as ElevationLevel);
  });

  for (const [name, value] of Object.entries(STATE_LAYER))
    tokens[`--md-sys-state-${kebab(name)}-opacity`] = String(value);

  return `${block(selector, tokens)}${block(joined, untracked)}@media (prefers-reduced-motion: reduce){${block(selector, reduced)}}`;
}
