import {
  Blend,
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  TonalPalette,
  Variant,
  hexFromArgb,
  type DynamicColor,
} from "@material/material-color-utilities";
import { seedArgb } from "./scheme.js";

const dynamic = new MaterialDynamicColors();

/**
 * Every M3 colour role, by the kebab name it is published under as `--md-sys-color-<role>`.
 *
 * @see https://m3.material.io/styles/color/roles
 */
const ROLES = {
  primary: () => dynamic.primary(),
  "on-primary": () => dynamic.onPrimary(),
  "primary-container": () => dynamic.primaryContainer(),
  "on-primary-container": () => dynamic.onPrimaryContainer(),
  "inverse-primary": () => dynamic.inversePrimary(),
  "primary-fixed": () => dynamic.primaryFixed(),
  "primary-fixed-dim": () => dynamic.primaryFixedDim(),
  "on-primary-fixed": () => dynamic.onPrimaryFixed(),
  "on-primary-fixed-variant": () => dynamic.onPrimaryFixedVariant(),
  secondary: () => dynamic.secondary(),
  "on-secondary": () => dynamic.onSecondary(),
  "secondary-container": () => dynamic.secondaryContainer(),
  "on-secondary-container": () => dynamic.onSecondaryContainer(),
  "secondary-fixed": () => dynamic.secondaryFixed(),
  "secondary-fixed-dim": () => dynamic.secondaryFixedDim(),
  "on-secondary-fixed": () => dynamic.onSecondaryFixed(),
  "on-secondary-fixed-variant": () => dynamic.onSecondaryFixedVariant(),
  tertiary: () => dynamic.tertiary(),
  "on-tertiary": () => dynamic.onTertiary(),
  "tertiary-container": () => dynamic.tertiaryContainer(),
  "on-tertiary-container": () => dynamic.onTertiaryContainer(),
  "tertiary-fixed": () => dynamic.tertiaryFixed(),
  "tertiary-fixed-dim": () => dynamic.tertiaryFixedDim(),
  "on-tertiary-fixed": () => dynamic.onTertiaryFixed(),
  "on-tertiary-fixed-variant": () => dynamic.onTertiaryFixedVariant(),
  error: () => dynamic.error(),
  "on-error": () => dynamic.onError(),
  "error-container": () => dynamic.errorContainer(),
  "on-error-container": () => dynamic.onErrorContainer(),
  background: () => dynamic.background(),
  "on-background": () => dynamic.onBackground(),
  surface: () => dynamic.surface(),
  "surface-dim": () => dynamic.surfaceDim(),
  "surface-bright": () => dynamic.surfaceBright(),
  "surface-container-lowest": () => dynamic.surfaceContainerLowest(),
  "surface-container-low": () => dynamic.surfaceContainerLow(),
  "surface-container": () => dynamic.surfaceContainer(),
  "surface-container-high": () => dynamic.surfaceContainerHigh(),
  "surface-container-highest": () => dynamic.surfaceContainerHighest(),
  "on-surface": () => dynamic.onSurface(),
  "surface-variant": () => dynamic.surfaceVariant(),
  "on-surface-variant": () => dynamic.onSurfaceVariant(),
  "inverse-surface": () => dynamic.inverseSurface(),
  "inverse-on-surface": () => dynamic.inverseOnSurface(),
  "surface-tint": () => dynamic.surfaceTint(),
  outline: () => dynamic.outline(),
  "outline-variant": () => dynamic.outlineVariant(),
  shadow: () => dynamic.shadow(),
  scrim: () => dynamic.scrim(),
} as const satisfies Record<string, () => DynamicColor>;

export type ColorRole = keyof typeof ROLES;

export const COLOR_ROLES = Object.freeze(Object.keys(ROLES)) as readonly ColorRole[];

export type ColorRoles = Record<ColorRole, string>;

/** Every role of a scheme as `#rrggbb`. */
export function resolveRoles(scheme: DynamicScheme): ColorRoles {
  const colors = {} as ColorRoles;
  for (const role of COLOR_ROLES) colors[role] = hexFromArgb(ROLES[role]().getArgb(scheme));
  return colors;
}

/** The four roles each custom colour group publishes, M3's "custom color" contract. */
export type ExtraRole<Name extends string> =
  | Name
  | `on-${Name}`
  | `${Name}-container`
  | `on-${Name}-container`;

export interface ExtraColorOptions {
  isDark: boolean;
  contrast?: number;
  /** Shift the hue toward the seed so it belongs to the palette; off for colours whose hue is the meaning. */
  harmonize?: boolean;
}

/**
 * Custom colour groups (success, warning, a brand accent...) generated under the same 2025 rules as
 * the scheme, so their containers sit on the same tonal ladder as `primaryContainer`. Chroma is
 * held at 48 or more so a semantic green stays recognisably green.
 *
 * @see https://m3.material.io/styles/color/advanced/define-new-colors
 */
export function resolveExtras<Name extends string>(
  seed: string,
  extras: Readonly<Record<Name, string>>,
  { isDark, contrast = 0, harmonize = true }: ExtraColorOptions,
): Record<ExtraRole<Name>, string> {
  const source = seedArgb(seed);
  const colors = {} as Record<ExtraRole<Name>, string>;
  for (const name of Object.keys(extras) as Name[]) {
    const value = seedArgb(extras[name]);
    const hct = Hct.fromInt(harmonize ? Blend.harmonize(value, source) : value);
    const scheme = new DynamicScheme({
      sourceColorHct: hct,
      variant: Variant.TONAL_SPOT,
      contrastLevel: contrast,
      isDark,
      specVersion: "2025",
      primaryPalette: TonalPalette.fromHueAndChroma(hct.hue, Math.max(48, hct.chroma)),
    });
    colors[name] = hexFromArgb(dynamic.primary().getArgb(scheme));
    colors[`on-${name}`] = hexFromArgb(dynamic.onPrimary().getArgb(scheme));
    colors[`${name}-container`] = hexFromArgb(dynamic.primaryContainer().getArgb(scheme));
    colors[`on-${name}-container`] = hexFromArgb(dynamic.onPrimaryContainer().getArgb(scheme));
  }
  return colors;
}
