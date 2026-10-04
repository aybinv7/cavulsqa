/**
 * The M3 type scale, baseline and emphasized, as androidx's generated tokens state it today. Sizes
 * and line heights are sp, tracking is sp; `brand` styles use the display face, `plain` the text
 * face. Three tracking values differ from the 2021 tables (displayLarge −0.2, titleMedium 0.2,
 * bodyMedium 0.2); the source is the authority.
 *
 * @see https://m3.material.io/styles/typography/type-scale-tokens
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt
 */
export interface TypeStyle {
  face: "brand" | "plain";
  size: number;
  lineHeight: number;
  weight: number;
  tracking: number;
  emphasizedWeight: number;
  emphasizedTracking: number;
}

const style = (
  face: TypeStyle["face"],
  size: number,
  lineHeight: number,
  weight: number,
  tracking: number,
  emphasizedWeight: number,
  emphasizedTracking: number,
): TypeStyle => ({
  face,
  size,
  lineHeight,
  weight,
  tracking,
  emphasizedWeight,
  emphasizedTracking,
});

export const TYPESCALE = {
  displayLarge: style("brand", 57, 64, 400, -0.2, 500, 0),
  displayMedium: style("brand", 45, 52, 400, 0, 500, 0),
  displaySmall: style("brand", 36, 44, 400, 0, 500, 0),
  headlineLarge: style("brand", 32, 40, 400, 0, 500, 0),
  headlineMedium: style("brand", 28, 36, 400, 0, 500, 0),
  headlineSmall: style("brand", 24, 32, 400, 0, 500, 0),
  titleLarge: style("brand", 22, 28, 400, 0, 500, 0),
  titleMedium: style("plain", 16, 24, 500, 0.2, 700, 0.15),
  titleSmall: style("plain", 14, 20, 500, 0.1, 700, 0.1),
  bodyLarge: style("plain", 16, 24, 400, 0.5, 500, 0.15),
  bodyMedium: style("plain", 14, 20, 400, 0.2, 500, 0.25),
  bodySmall: style("plain", 12, 16, 400, 0.4, 500, 0.4),
  labelLarge: style("plain", 14, 20, 500, 0.1, 700, 0.1),
  labelMedium: style("plain", 12, 16, 500, 0.5, 700, 0.5),
  labelSmall: style("plain", 11, 16, 500, 0.5, 700, 0.5),
} as const satisfies Record<string, TypeStyle>;

export type TypeToken = keyof typeof TYPESCALE;
