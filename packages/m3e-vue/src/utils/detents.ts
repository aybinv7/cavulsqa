/**
 * The anchors of a standard bottom sheet and where a release settles, after Compose's
 * `AnchoredDraggableState`. Offsets are distances the sheet is translated down from fully open, so
 * `expanded` is 0 and larger offsets show less of it. Pure, so every release is testable.
 */
export type SheetDetent = "hidden" | "peek" | "half" | "expanded";

export interface DetentAnchor {
  detent: SheetDetent;
  offset: number;
}

export interface DetentLayout {
  /** The sheet's own height: its content, capped by the space above the bottom edge. */
  sheetHeight: number;
  /** The space the sheet may cover, for the half detent. */
  available: number;
  /** What a peeking sheet shows, the bottom inset included. */
  peekVisible: number;
  half: boolean;
  hideable: boolean;
}

/** `BottomSheetDefaults.PositionalThreshold` and `VelocityThreshold`, in px and px per second. */
export const POSITIONAL_THRESHOLD = 56;
export const VELOCITY_THRESHOLD = 125;

/**
 * The anchors the sheet can rest at, top to bottom. A detent that would show as much as a taller
 * one collapses into it, so a short sheet has no half and a tiny one no peek.
 */
export function detentAnchors(layout: DetentLayout): DetentAnchor[] {
  const height = Math.max(0, layout.sheetHeight);
  const anchors: DetentAnchor[] = [{ detent: "expanded", offset: 0 }];
  const add = (detent: SheetDetent, visible: number) => {
    const offset = Math.round(Math.max(0, height - visible));
    if (offset > anchors.at(-1)!.offset) anchors.push({ detent, offset });
  };
  if (layout.half) add("half", layout.available / 2);
  add("peek", layout.peekVisible);
  if (layout.hideable) add("hidden", 0);
  return anchors;
}

/** Where a detent sits, or the nearest one the layout kept when it collapsed away. */
export function offsetOf(detent: SheetDetent, anchors: readonly DetentAnchor[]): DetentAnchor {
  const exact = anchors.find((anchor) => anchor.detent === detent);
  if (exact) return exact;
  const order: SheetDetent[] = ["expanded", "half", "peek", "hidden"];
  const wanted = order.indexOf(detent);
  const kept = anchors.filter((anchor) => order.indexOf(anchor.detent) <= wanted);
  return kept.at(-1) ?? anchors[0]!;
}

/**
 * Compose's settle: a fling past the velocity threshold goes to the next anchor in its direction;
 * a slower release moves on only when it travelled the positional threshold away from the anchor it
 * last passed, and otherwise springs back to it. `from` is where the drag began - a finger that
 * stops before lifting still has a direction.
 */
export function settleDetent(
  offset: number,
  velocity: number,
  anchors: readonly DetentAnchor[],
  from: number,
): DetentAnchor {
  const sorted = [...anchors].sort((a, b) => a.offset - b.offset);
  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  if (offset <= first.offset) return first;
  if (offset >= last.offset) return last;
  const above = sorted.filter((anchor) => anchor.offset <= offset).at(-1)!;
  const below = sorted.find((anchor) => anchor.offset >= offset)!;
  if (Math.abs(velocity) >= VELOCITY_THRESHOLD) return velocity > 0 ? below : above;
  if (offset >= from) return offset - above.offset >= POSITIONAL_THRESHOLD ? below : above;
  return below.offset - offset >= POSITIONAL_THRESHOLD ? above : below;
}
