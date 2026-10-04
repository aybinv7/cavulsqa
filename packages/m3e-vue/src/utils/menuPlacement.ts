/**
 * Where a submenu goes beside the item that opened it, with Compose's `MenuAnchorPosition.End`
 * candidates: its start against the item's end, else its end against the item's start, else held
 * inside the window; vertically its top on the item's top, else its bottom on the item's bottom,
 * else held inside the window. `gap` separates it from the item's surface. Pure, so a phone too
 * narrow for either side is testable.
 */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const MARGIN = 8;

export function placeSubmenu(
  item: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  rtl = false,
  gap = 0,
): { left: number; top: number } {
  const fitsX = (x: number) => x >= MARGIN && x + size.width <= viewport.width - MARGIN;
  const fitsY = (y: number) => y >= MARGIN && y + size.height <= viewport.height - MARGIN;
  const clampX = (x: number) => Math.min(viewport.width - MARGIN - size.width, Math.max(MARGIN, x));
  const clampY = (y: number) =>
    Math.min(viewport.height - MARGIN - size.height, Math.max(MARGIN, y));
  const towardEnd = rtl ? item.left - gap - size.width : item.right + gap;
  const towardStart = rtl ? item.right + gap : item.left - gap - size.width;
  const left = fitsX(towardEnd) ? towardEnd : fitsX(towardStart) ? towardStart : clampX(towardEnd);
  const topAligned = item.top;
  const bottomAligned = item.bottom - size.height;
  const top = fitsY(topAligned)
    ? topAligned
    : fitsY(bottomAligned)
      ? bottomAligned
      : clampY(topAligned);
  return { left, top };
}
