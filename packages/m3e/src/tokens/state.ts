/**
 * State layer opacities: the content colour (the "on-" role) laid over the container.
 *
 * @see https://m3.material.io/foundations/interaction/states/state-layers
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StateTokens.kt
 */
export const STATE_LAYER = {
  hover: 0.08,
  focus: 0.1,
  pressed: 0.1,
  dragged: 0.16,
  disabledContainer: 0.12,
  disabledContent: 0.38,
} as const;

export type StateToken = keyof typeof STATE_LAYER;
