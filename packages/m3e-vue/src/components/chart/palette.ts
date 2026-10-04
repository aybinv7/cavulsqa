/**
 * Series colours from the theme's roles, in an order that keeps neighbours distinct in light and
 * dark: primary, tertiary, secondary, then the deeper container tones. `--m3-chart-1` to `-6`
 * override any of them.
 */
const ROLES = [
  "primary",
  "tertiary",
  "secondary",
  "on-primary-container",
  "on-tertiary-container",
  "outline",
] as const;

export function seriesColor(index: number, override?: string): string {
  if (override) return override;
  const slot = (index % ROLES.length) + 1;
  return `var(--m3-chart-${slot}, var(--md-sys-color-${ROLES[index % ROLES.length]}))`;
}

export interface ChartSeries {
  label: string;
  values: readonly (number | null)[];
  color?: string;
}
