/**
 * The frames of a search bar opening into Compose's full-screen search view. One progress, 0 to 1,
 * drives everything - as `SearchBarState.progress` does - so a spring interrupted half way reverses
 * from wherever it is. Pure: given the bar's rect and the viewport, it says where every part sits.
 */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SearchFrame {
  /** `clip-path` for the full-screen surface: the bar's rect at 0, the whole viewport at 1. */
  clip: string;
  /** The header row's offset from its resting place, and its width. */
  headerX: number;
  headerY: number;
  headerWidth: number;
  /** Opacity of what only the expanded view has: the back arrow, the divider, the results. */
  reveal: number;
}

/** Compose's collapsed corner: half the 56dp input field. */
export const SEARCH_BAR_RADIUS = 28;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * `headerRest` is where the header row sits when fully open - its top, below the status bar - so
 * the closed state translates it back up onto the bar.
 */
export function searchFrame(
  progress: number,
  bar: Rect,
  viewport: { width: number; height: number },
  headerRest: { top: number },
): SearchFrame {
  const p = Math.min(1, Math.max(0, progress));
  const top = lerp(bar.top, 0, p);
  const left = lerp(bar.left, 0, p);
  const right = lerp(viewport.width - bar.left - bar.width, 0, p);
  const bottom = lerp(viewport.height - bar.top - bar.height, 0, p);
  const radius = SEARCH_BAR_RADIUS * (1 - p);
  return {
    clip: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`,
    headerX: left,
    headerY: lerp(bar.top - headerRest.top, 0, p),
    headerWidth: lerp(bar.width, viewport.width, p),
    reveal: p,
  };
}
