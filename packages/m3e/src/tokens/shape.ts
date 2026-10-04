/**
 * The M3 Expressive corner radius scale, in dp. `full` is a pill at any size; a component that
 * animates between `full` and a fixed corner must use half its own height instead, since a
 * transition from 9999px reads as no change until the very last frame.
 *
 * @see https://m3.material.io/styles/shape/corner-radius-scale
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ShapeTokens.kt
 */
export const CORNER = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  largeIncreased: 20,
  extraLarge: 28,
  extraLargeIncreased: 32,
  extraExtraLarge: 48,
  full: 9999,
} as const;

export type CornerToken = keyof typeof CORNER;
