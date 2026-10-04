export type Side = "top" | "bottom";

export interface AnchoredPosition {
  top: number;
  left: number;
  side: Side;
}

const MARGIN = 8;

/**
 * Where a floating surface of `size` goes next to `anchor`: on the preferred side when it fits,
 * on the other side when it does not, centred on the anchor and clamped inside the viewport.
 * Pure, so the edge cases - a tooltip on a button at the screen's very edge - are testable.
 */
export function placeBeside(
  anchor: DOMRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  preferred: Side = "top",
  gap = 4,
): AnchoredPosition {
  const above = anchor.top - gap - size.height;
  const below = anchor.bottom + gap;
  const fitsAbove = above >= MARGIN;
  const fitsBelow = below + size.height <= viewport.height - MARGIN;
  const side: Side =
    preferred === "top"
      ? fitsAbove || !fitsBelow
        ? "top"
        : "bottom"
      : fitsBelow || !fitsAbove
        ? "bottom"
        : "top";
  const rawLeft = anchor.left + anchor.width / 2 - size.width / 2;
  return {
    side,
    top:
      side === "top"
        ? Math.max(MARGIN, above)
        : Math.min(viewport.height - MARGIN - size.height, below),
    left: Math.min(viewport.width - MARGIN - size.width, Math.max(MARGIN, rawLeft)),
  };
}
