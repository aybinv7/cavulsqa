export type PopoverSide = "top" | "bottom";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverPlacement {
  top: number;
  left: number;
  side: PopoverSide;
  maxHeight: number;
  /** The anchor's centre relative to the popover, for a transform-origin that grows from it. */
  originX: number;
  originY: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
}

const MARGIN = 8;

/**
 * Where a popover of `size` goes against `anchor`: on the preferred side when it fits, else on the
 * side with more room, aligned to the anchor's start, centre or end (mirrored right to left) and
 * held inside the viewport. When neither side fits, it takes the roomier one and its height is
 * capped there, so its content scrolls instead of running off screen.
 */
export function placePopover(
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  options: { side?: PopoverSide; align?: PopoverAlign; rtl?: boolean; gap?: number } = {},
): PopoverPlacement {
  const { side: preferred = "bottom", align = "center", rtl = false, gap = 8 } = options;
  const roomAbove = anchor.top - gap - MARGIN;
  const roomBelow = viewport.height - anchor.bottom - gap - MARGIN;
  const fits = (side: PopoverSide) => (side === "top" ? roomAbove : roomBelow) >= size.height;
  const other: PopoverSide = preferred === "top" ? "bottom" : "top";
  const side = fits(preferred)
    ? preferred
    : fits(other)
      ? other
      : roomBelow >= roomAbove
        ? "bottom"
        : "top";
  const maxHeight = Math.max(0, side === "top" ? roomAbove : roomBelow);
  const height = Math.min(size.height, maxHeight);

  const start = rtl ? anchor.right - size.width : anchor.left;
  const end = rtl ? anchor.left : anchor.right - size.width;
  const centre = anchor.left + anchor.width / 2 - size.width / 2;
  const raw = align === "start" ? start : align === "end" ? end : centre;
  const left = Math.min(viewport.width - MARGIN - size.width, Math.max(MARGIN, raw));
  const top = side === "bottom" ? anchor.bottom + gap : anchor.top - gap - height;

  return {
    top,
    left,
    side,
    maxHeight,
    originX: Math.min(size.width, Math.max(0, anchor.left + anchor.width / 2 - left)),
    originY: side === "bottom" ? 0 : height,
  };
}
