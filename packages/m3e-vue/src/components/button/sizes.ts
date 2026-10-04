/**
 * Button and icon-button metrics per size, in dp, from androidx `Button*Tokens` and the specs page.
 * `round` is half the height, which is what `full` resolves to for these fixed heights, so the
 * press morph animates between two real radii instead of from 9999px.
 *
 * @see https://m3.material.io/components/buttons/specs
 * @see https://m3.material.io/components/icon-buttons/specs
 */
export type ButtonSize = "xs" | "s" | "m" | "l" | "xl";

export interface ButtonMetrics {
  height: number;
  padding: number;
  icon: number;
  /** Icon buttons draw a larger glyph than buttons at S: `SmallIconButtonTokens.IconSize` is 24. */
  iconButtonIcon: number;
  gap: number;
  square: number;
  pressed: number;
  outline: number;
  type: "label-large" | "title-medium" | "headline-small" | "headline-large";
  iconWidth: { narrow: number; default: number; wide: number };
  groupGap: number;
  connectedInner: number;
}

export const BUTTON_METRICS: Readonly<Record<ButtonSize, ButtonMetrics>> = {
  xs: {
    height: 32,
    padding: 12,
    icon: 20,
    iconButtonIcon: 20,
    gap: 4,
    square: 12,
    pressed: 8,
    outline: 1,
    type: "label-large",
    iconWidth: { narrow: 28, default: 32, wide: 40 },
    groupGap: 18,
    connectedInner: 4,
  },
  s: {
    height: 40,
    padding: 16,
    icon: 20,
    iconButtonIcon: 24,
    gap: 8,
    square: 12,
    pressed: 8,
    outline: 1,
    type: "label-large",
    iconWidth: { narrow: 32, default: 40, wide: 52 },
    groupGap: 12,
    connectedInner: 8,
  },
  m: {
    height: 56,
    padding: 24,
    icon: 24,
    iconButtonIcon: 24,
    gap: 8,
    square: 16,
    pressed: 12,
    outline: 1,
    type: "title-medium",
    iconWidth: { narrow: 48, default: 56, wide: 72 },
    groupGap: 8,
    connectedInner: 8,
  },
  l: {
    height: 96,
    padding: 48,
    icon: 32,
    iconButtonIcon: 32,
    gap: 12,
    square: 28,
    pressed: 16,
    outline: 2,
    type: "headline-small",
    iconWidth: { narrow: 64, default: 96, wide: 128 },
    groupGap: 8,
    connectedInner: 16,
  },
  xl: {
    height: 136,
    padding: 64,
    icon: 40,
    iconButtonIcon: 40,
    gap: 16,
    square: 28,
    pressed: 16,
    outline: 3,
    type: "headline-large",
    iconWidth: { narrow: 104, default: 136, wide: 184 },
    groupGap: 8,
    connectedInner: 20,
  },
};

/** The CSS variables a size sets on a button; every visual rule reads these. */
export function buttonVariables(
  size: ButtonSize,
  width?: keyof ButtonMetrics["iconWidth"],
): Record<string, string> {
  const m = BUTTON_METRICS[size];
  return {
    "--m3-btn-height": `${m.height}px`,
    "--m3-btn-padding": `${m.padding}px`,
    "--m3-btn-icon": `${width ? m.iconButtonIcon : m.icon}px`,
    "--m3-btn-gap": `${m.gap}px`,
    "--m3-btn-round": `${m.height / 2}px`,
    "--m3-btn-square": `${m.square}px`,
    "--m3-btn-pressed": `${m.pressed}px`,
    "--m3-btn-outline": `${m.outline}px`,
    "--m3-btn-font": `var(--md-sys-typescale-${m.type}-font)`,
    "--m3-btn-font-size": `var(--md-sys-typescale-${m.type}-size)`,
    "--m3-btn-line-height": `var(--md-sys-typescale-${m.type}-line-height)`,
    "--m3-btn-font-weight": `var(--md-sys-typescale-${m.type}-weight)`,
    "--m3-btn-tracking": `var(--md-sys-typescale-${m.type}-tracking)`,
    ...(width ? { "--m3-btn-width": `${m.iconWidth[width]}px` } : {}),
  };
}
