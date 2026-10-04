/**
 * Material 3 pull-to-refresh physics from `androidx.compose.material3.pulltorefresh`: the finger
 * moves the indicator at half speed up to an 80dp threshold; past it the pull meets growing
 * tension and the indicator stops at twice the threshold. Progress is travel over the threshold,
 * so the indicator's morph runs exactly as fast as the hand pulls.
 *
 * @see https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/pulltorefresh/PullToRefresh.kt
 */
export const PULL_THRESHOLD = 80;
export const PULL_DRAG_MULTIPLIER = 0.5;
/** The indicator's container: it starts fully hidden above the content's top edge. */
export const PULL_INDICATOR_SIZE = 48;

/** Indicator travel over the threshold for a finger `pulled` pixels down: 0 hidden, 1 armed. */
export function pullFraction(pulled: number, threshold = PULL_THRESHOLD): number {
  const adjusted = Math.max(0, pulled) * PULL_DRAG_MULTIPLIER;
  if (adjusted <= threshold) return adjusted / threshold;
  const over = Math.min(2, adjusted / threshold - 1);
  return 1 + over - (over * over) / 4;
}

/** Released past the threshold: refresh. Anything less springs back without one. */
export function pullArmed(pulled: number, threshold = PULL_THRESHOLD): boolean {
  return Math.max(0, pulled) * PULL_DRAG_MULTIPLIER > threshold;
}

/** Where the indicator's top edge sits, from the content's top edge. */
export function pullIndicatorOffset(fraction: number, threshold = PULL_THRESHOLD): number {
  return fraction * threshold - PULL_INDICATOR_SIZE;
}

/** Past the threshold the indicator keeps turning with the pull, as Compose does. */
export function pullOverRotation(fraction: number): number {
  return fraction > 1 ? -(fraction - 1) * 180 : 0;
}
