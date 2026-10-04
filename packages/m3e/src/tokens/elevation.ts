/**
 * Elevation levels in dp. Depth in M3 is first a surface-container role; a shadow is added only to
 * floating surfaces (menus, FABs, dialogs, snackbars, sheets in flight).
 *
 * @see https://m3.material.io/styles/elevation/tokens
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ElevationTokens.kt
 */
export const ELEVATION = [0, 1, 3, 6, 8, 12] as const;

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** The key and ambient shadow pair of each level, from the M3 design kit. */
const SHADOWS: Record<ElevationLevel, readonly [key: string, ambient: string]> = {
  0: ["0 0 0 0", "0 0 0 0"],
  1: ["0 1px 2px 0", "0 1px 3px 1px"],
  2: ["0 1px 2px 0", "0 2px 6px 2px"],
  3: ["0 1px 3px 0", "0 4px 8px 3px"],
  4: ["0 2px 3px 0", "0 6px 10px 4px"],
  5: ["0 4px 4px 0", "0 8px 12px 6px"],
};

export function elevationShadow(
  level: ElevationLevel,
  color = "var(--md-sys-color-shadow)",
): string {
  if (level === 0) return "none";
  const [key, ambient] = SHADOWS[level];
  return `${key} color-mix(in srgb, ${color} 30%, transparent), ${ambient} color-mix(in srgb, ${color} 15%, transparent)`;
}
