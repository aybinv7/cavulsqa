/**
 * Compose's carousel keylines: the fixed positions along the container where an item has a given
 * mask size. Ported from androidx `KeylineList.kt` so a carousel here masks, shifts and snaps the
 * way it does on Android. Pure - every list is testable without a DOM.
 */
export interface Keyline {
  /** The mask size of an item sitting on this keyline. */
  size: number;
  /** The keyline's centre along the container. */
  offset: number;
  /** Where the keyline would sit if every item were full size - the scroll-space position. */
  unadjustedOffset: number;
  isFocal: boolean;
  isAnchor: boolean;
  isPivot: boolean;
  /** How much of an item on this keyline falls outside the container. */
  cutoff: number;
}

export interface KeylineList {
  keylines: Keyline[];
  pivotIndex: number;
  firstFocalIndex: number;
  lastFocalIndex: number;
  firstNonAnchorIndex: number;
  lastNonAnchorIndex: number;
}

export interface KeylineEntry {
  size: number;
  isAnchor: boolean;
}

export type CarouselAlignment = "start" | "center" | "end";

export const EMPTY_KEYLINES: KeylineList = {
  keylines: [],
  pivotIndex: -1,
  firstFocalIndex: -1,
  lastFocalIndex: -1,
  firstNonAnchorIndex: -1,
  lastNonAnchorIndex: -1,
};

function focalRange(entries: readonly KeylineEntry[]): {
  first: number;
  last: number;
  size: number;
} {
  let first = -1;
  let size = 0;
  entries.forEach((entry, index) => {
    if (!entry.isAnchor && entry.size > size) {
      first = index;
      size = entry.size;
    }
  });
  let last = first;
  while (last >= 0 && last + 1 < entries.length && entries[last + 1]!.size === size) last++;
  return { first, last, size };
}

const isCutoffLeft = (size: number, offset: number) =>
  offset - size / 2 < 0 && offset + size / 2 > 0;

const isCutoffRight = (size: number, offset: number, space: number) =>
  offset - size / 2 < space && offset + size / 2 > space;

function pivotFor(
  alignment: CarouselAlignment,
  space: number,
  spacing: number,
  focal: { first: number; last: number; size: number },
): number {
  if (alignment === "start") return focal.size / 2;
  if (alignment === "end") return space - focal.size / 2;
  const focalItemCount = focal.last - focal.first;
  const spacingSplit = spacing === 0 || focalItemCount % 2 === 0 ? 0 : spacing / 2;
  return (
    space / 2 -
    (focal.size / 2) * focalItemCount -
    spacingSplit -
    Math.trunc(focalItemCount / 2) * spacing
  );
}

/**
 * Lays the entries out around a pivot keyline: neighbours step away by their own size plus the
 * spacing, while the unadjusted offsets step by the focal size, as items do in scroll space.
 * `placement` is an alignment for a default list, or an explicit pivot for a shifted step.
 */
export function keylineListOf(
  space: number,
  spacing: number,
  entries: readonly KeylineEntry[],
  placement: CarouselAlignment | { pivotIndex: number; pivotOffset: number },
): KeylineList {
  const focal = focalRange(entries);
  if (entries.length === 0 || focal.first < 0) return EMPTY_KEYLINES;
  const pivotIndex = typeof placement === "string" ? focal.first : placement.pivotIndex;
  const pivotOffset =
    typeof placement === "string"
      ? pivotFor(placement, space, spacing, focal)
      : placement.pivotOffset;
  if (pivotIndex < 0 || pivotIndex >= entries.length) return EMPTY_KEYLINES;

  const keylines: Keyline[] = Array.from({ length: entries.length });
  const make = (index: number, offset: number, unadjustedOffset: number, cutoff: number) => {
    const entry = entries[index]!;
    keylines[index] = {
      size: entry.size,
      offset,
      unadjustedOffset,
      isFocal: index >= focal.first && index <= focal.last,
      isAnchor: entry.isAnchor,
      isPivot: index === pivotIndex,
      cutoff,
    };
  };

  const pivot = entries[pivotIndex]!;
  const pivotCutoff = isCutoffLeft(pivot.size, pivotOffset)
    ? pivotOffset - pivot.size / 2
    : isCutoffRight(pivot.size, pivotOffset, space)
      ? pivotOffset + pivot.size / 2 - space
      : 0;
  make(pivotIndex, pivotOffset, pivotOffset, pivotCutoff);

  let offset = pivotOffset - focal.size / 2 - spacing;
  let unadjusted = pivotOffset - focal.size / 2 - spacing;
  for (let index = pivotIndex - 1; index >= 0; index--) {
    const size = entries[index]!.size;
    const at = offset - size / 2;
    const cutoff = isCutoffLeft(size, at) ? Math.abs(at - size / 2) : 0;
    make(index, at, unadjusted - focal.size / 2, cutoff);
    offset -= size + spacing;
    unadjusted -= focal.size + spacing;
  }

  offset = pivotOffset + focal.size / 2 + spacing;
  unadjusted = pivotOffset + focal.size / 2 + spacing;
  for (let index = pivotIndex + 1; index < entries.length; index++) {
    const size = entries[index]!.size;
    const at = offset + size / 2;
    const cutoff = isCutoffRight(size, at, space) ? at + size / 2 - space : 0;
    make(index, at, unadjusted + focal.size / 2, cutoff);
    offset += size + spacing;
    unadjusted += focal.size + spacing;
  }

  const firstNonAnchorIndex = keylines.findIndex((keyline) => !keyline.isAnchor);
  const lastNonAnchorIndex = keylines.findLastIndex((keyline) => !keyline.isAnchor);
  return {
    keylines,
    pivotIndex,
    firstFocalIndex: focal.first,
    lastFocalIndex: focal.last,
    firstNonAnchorIndex,
    lastNonAnchorIndex,
  };
}

export const entriesOf = (list: KeylineList): KeylineEntry[] =>
  list.keylines.map((keyline) => ({ size: keyline.size, isAnchor: keyline.isAnchor }));

export const firstFocal = (list: KeylineList) => list.keylines[list.firstFocalIndex]!;
export const lastFocal = (list: KeylineList) => list.keylines[list.lastFocalIndex]!;
export const pivotOf = (list: KeylineList) => list.keylines[list.pivotIndex]!;
export const focalCount = (list: KeylineList) => list.lastFocalIndex - list.firstFocalIndex + 1;

export function isFirstFocalItemAtStartOfContainer(list: KeylineList): boolean {
  const focal = firstFocal(list);
  return focal.offset - focal.size / 2 >= 0 && list.firstFocalIndex === list.firstNonAnchorIndex;
}

export function isLastFocalItemAtEndOfContainer(list: KeylineList, space: number): boolean {
  const focal = lastFocal(list);
  return focal.offset + focal.size / 2 <= space && list.lastFocalIndex === list.lastNonAnchorIndex;
}

export function firstIndexAfterFocalRangeWithSize(list: KeylineList, size: number): number {
  for (let index = list.lastFocalIndex; index < list.keylines.length; index++) {
    if (list.keylines[index]!.size === size) return index;
  }
  return list.keylines.length - 1;
}

export function lastIndexBeforeFocalRangeWithSize(list: KeylineList, size: number): number {
  for (let index = list.firstFocalIndex - 1; index >= 0; index--) {
    if (list.keylines[index]!.size === size) return index;
  }
  return 0;
}

export function keylineBefore(list: KeylineList, unadjustedOffset: number): Keyline {
  for (let index = list.keylines.length - 1; index >= 0; index--) {
    const keyline = list.keylines[index]!;
    if (keyline.unadjustedOffset < unadjustedOffset) return keyline;
  }
  return list.keylines[0]!;
}

export function keylineAfter(list: KeylineList, unadjustedOffset: number): Keyline {
  return (
    list.keylines.find((keyline) => keyline.unadjustedOffset >= unadjustedOffset) ??
    list.keylines.at(-1)!
  );
}

const mix = (from: number, to: number, fraction: number) => from + (to - from) * fraction;

export function lerpKeyline(from: Keyline, to: Keyline, fraction: number): Keyline {
  const flags = fraction < 0.5 ? from : to;
  return {
    size: mix(from.size, to.size, fraction),
    offset: mix(from.offset, to.offset, fraction),
    unadjustedOffset: mix(from.unadjustedOffset, to.unadjustedOffset, fraction),
    cutoff: mix(from.cutoff, to.cutoff, fraction),
    isFocal: flags.isFocal,
    isAnchor: flags.isAnchor,
    isPivot: flags.isPivot,
  };
}

/** Index-wise, as Compose does: the steps of one strategy always hold the same count. */
export function lerpKeylineList(from: KeylineList, to: KeylineList, fraction: number): KeylineList {
  const flags = fraction < 0.5 ? from : to;
  return {
    ...flags,
    keylines: from.keylines.map((keyline, index) =>
      lerpKeyline(keyline, to.keylines[index]!, fraction),
    ),
  };
}
