import { EMPTY_KEYLINES, keylineListOf, type KeylineEntry, type KeylineList } from "./keylines.js";

/**
 * How many large, medium and small items fill the container, and at what sizes - androidx
 * `Arrangement.kt` and the keyline recipes in `Keylines.kt`, ported line for line so a container
 * width yields the same items here as on Android.
 */
export interface Arrangement {
  priority: number;
  smallSize: number;
  smallCount: number;
  mediumSize: number;
  mediumCount: number;
  largeSize: number;
  largeCount: number;
}

export interface SmallRange {
  min: number;
  max: number;
}

/** `CarouselDefaults`: small items 40-56dp, anchors 10dp. */
export const MIN_SMALL_ITEM_SIZE = 40;
export const MAX_SMALL_ITEM_SIZE = 56;
export const ANCHOR_SIZE = 10;
const MEDIUM_ITEM_FLEX_PERCENTAGE = 0.1;
const MEDIUM_LARGE_ITEM_DIFF_THRESHOLD = 0.85;

const itemCountOf = (arrangement: Arrangement) =>
  arrangement.largeCount + arrangement.mediumCount + arrangement.smallCount;

function isValid(arrangement: Arrangement): boolean {
  const { largeCount, mediumCount, smallCount, largeSize, mediumSize, smallSize } = arrangement;
  if (largeCount > 0 && smallCount > 0 && mediumCount > 0) {
    return largeSize > mediumSize && mediumSize > smallSize;
  }
  if (largeCount > 0 && smallCount > 0) return largeSize > smallSize;
  return true;
}

function cost(arrangement: Arrangement, targetLargeSize: number): number {
  if (!isValid(arrangement)) return Number.MAX_VALUE;
  return Math.abs(targetLargeSize - arrangement.largeSize) * arrangement.priority;
}

function calculateLargeSize(
  availableSpace: number,
  smallCount: number,
  smallSize: number,
  mediumCount: number,
  largeCount: number,
): number {
  return (
    (availableSpace - (smallCount + mediumCount / 2) * smallSize) / (largeCount + mediumCount / 2)
  );
}

interface FitRequest {
  availableSpace: number;
  itemSpacing: number;
  smallCount: number;
  smallSize: number;
  small: SmallRange;
  mediumCount: number;
  mediumSize: number;
  largeCount: number;
  largeSize: number;
}

function fit(priority: number, request: FitRequest): Arrangement {
  const { smallCount, mediumCount, largeCount, small } = request;
  const total = largeCount + mediumCount + smallCount;
  const available = request.availableSpace - (total - 1) * request.itemSpacing;
  let smallSize = Math.min(small.max, Math.max(small.min, request.smallSize));
  const taken =
    request.largeSize * largeCount + request.mediumSize * mediumCount + smallSize * smallCount;
  const delta = available - taken;
  if (smallCount > 0 && delta > 0) smallSize += Math.min(delta / smallCount, small.max - smallSize);
  else if (smallCount > 0 && delta < 0) {
    smallSize += Math.max(delta / smallCount, small.min - smallSize);
  }
  if (smallCount === 0) smallSize = 0;
  let largeSize = calculateLargeSize(available, smallCount, smallSize, mediumCount, largeCount);
  let mediumSize = (largeSize + smallSize) / 2;
  if (mediumCount > 0 && largeSize !== request.largeSize) {
    const targetAdjustment = (request.largeSize - largeSize) * largeCount;
    const flex = mediumSize * MEDIUM_ITEM_FLEX_PERCENTAGE * mediumCount;
    const distribute = Math.min(Math.abs(targetAdjustment), flex);
    if (targetAdjustment > 0) {
      mediumSize -= distribute / mediumCount;
      largeSize += distribute / largeCount;
    } else {
      mediumSize += distribute / mediumCount;
      largeSize -= distribute / largeCount;
    }
  }
  return { priority, smallSize, smallCount, mediumSize, mediumCount, largeSize, largeCount };
}

export interface ArrangementSearch {
  availableSpace: number;
  itemSpacing: number;
  targetSmallSize: number;
  small: SmallRange;
  smallCounts: readonly number[];
  targetMediumSize: number;
  mediumCounts: readonly number[];
  targetLargeSize: number;
  largeCounts: readonly number[];
}

/** Every candidate in Compose's order; the first of equal cost wins, a perfect fit ends the search. */
export function findLowestCostArrangement(search: ArrangementSearch): Arrangement | null {
  let lowest: Arrangement | null = null;
  let priority = 1;
  for (const largeCount of search.largeCounts) {
    for (const mediumCount of search.mediumCounts) {
      for (const smallCount of search.smallCounts) {
        const candidate = fit(priority, {
          availableSpace: search.availableSpace,
          itemSpacing: search.itemSpacing,
          smallCount,
          smallSize: search.targetSmallSize,
          small: search.small,
          mediumCount,
          mediumSize: search.targetMediumSize,
          largeCount,
          largeSize: search.targetLargeSize,
        });
        if (
          !lowest ||
          cost(candidate, search.targetLargeSize) < cost(lowest, search.targetLargeSize)
        ) {
          lowest = candidate;
          if (cost(lowest, search.targetLargeSize) === 0) return lowest;
        }
        priority++;
      }
    }
  }
  return lowest;
}

const descending = (max: number, min: number) =>
  Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => max - index);

function leftAligned(
  space: number,
  spacing: number,
  leftAnchor: number,
  rightAnchor: number,
  arrangement: Arrangement,
): KeylineList {
  const entries: KeylineEntry[] = [{ size: leftAnchor, isAnchor: true }];
  const push = (count: number, size: number) => {
    for (let index = 0; index < count; index++) entries.push({ size, isAnchor: false });
  };
  push(arrangement.largeCount, arrangement.largeSize);
  push(arrangement.mediumCount, arrangement.mediumSize);
  push(arrangement.smallCount, arrangement.smallSize);
  entries.push({ size: rightAnchor, isAnchor: true });
  return keylineListOf(space, spacing, entries, "start");
}

function centerAligned(
  space: number,
  spacing: number,
  leftAnchor: number,
  rightAnchor: number,
  arrangement: Arrangement,
): KeylineList {
  const entries: KeylineEntry[] = [{ size: leftAnchor, isAnchor: true }];
  const push = (count: number, size: number) => {
    for (let index = 0; index < count; index++) entries.push({ size, isAnchor: false });
  };
  const halfSmall = Math.trunc(arrangement.smallCount / 2);
  const halfMedium = Math.trunc(arrangement.mediumCount / 2);
  push(halfSmall, arrangement.smallSize);
  push(halfMedium, arrangement.mediumSize);
  push(arrangement.largeCount, arrangement.largeSize);
  push(halfMedium, arrangement.mediumSize);
  push(halfSmall, arrangement.smallSize);
  entries.push({ size: rightAnchor, isAnchor: true });
  return keylineListOf(space, spacing, entries, "center");
}

/** `multiBrowseKeylineList`: large items, then a medium and a small one peeking. */
export function multiBrowseKeylines(
  space: number,
  preferredItemSize: number,
  itemSpacing: number,
  itemCount: number,
  small: SmallRange = { min: MIN_SMALL_ITEM_SIZE, max: MAX_SMALL_ITEM_SIZE },
): KeylineList {
  if (space === 0 || preferredItemSize === 0) return EMPTY_KEYLINES;
  let smallCounts = [1];
  const mediumCounts = [1, 0];
  const targetLargeSize = Math.min(preferredItemSize, space);
  const targetSmallSize = Math.min(small.max, Math.max(small.min, targetLargeSize / 3));
  const targetMediumSize = (targetLargeSize + targetSmallSize) / 2;
  if (space < small.min * 2) smallCounts = [0];
  const minAvailableLargeSpace =
    space - targetMediumSize * Math.max(...mediumCounts) - small.max * Math.max(...smallCounts);
  const minLargeCount = Math.max(1, Math.floor(minAvailableLargeSpace / targetLargeSize));
  const maxLargeCount = Math.ceil(space / targetLargeSize);
  const largeCounts = descending(maxLargeCount, minLargeCount);
  const search: ArrangementSearch = {
    availableSpace: space,
    itemSpacing,
    targetSmallSize,
    small,
    smallCounts,
    targetMediumSize,
    mediumCounts,
    targetLargeSize,
    largeCounts,
  };
  let arrangement = findLowestCostArrangement(search);
  if (arrangement && itemCountOf(arrangement) > itemCount) {
    let surplus = itemCountOf(arrangement) - itemCount;
    let smallCount = arrangement.smallCount;
    let mediumCount = arrangement.mediumCount;
    while (surplus > 0) {
      if (smallCount > 0) smallCount -= 1;
      else if (mediumCount > 1) mediumCount -= 1;
      surplus -= 1;
    }
    arrangement = findLowestCostArrangement({
      ...search,
      smallCounts: [smallCount],
      mediumCounts: [mediumCount],
    });
  }
  if (!arrangement) return EMPTY_KEYLINES;
  return leftAligned(space, itemSpacing, ANCHOR_SIZE, ANCHOR_SIZE, arrangement);
}

function calculateMediumChildSize(
  minimumMediumSize: number,
  largeItemSize: number,
  remainingSpace: number,
): number {
  let mediumSize = Math.max(remainingSpace * 1.5, minimumMediumSize);
  const threshold = largeItemSize * MEDIUM_LARGE_ITEM_DIFF_THRESHOLD;
  if (mediumSize > threshold) {
    mediumSize = Math.min(Math.max(threshold, remainingSpace * 1.2), largeItemSize);
  }
  return mediumSize;
}

/** `uncontainedKeylineList`: full-size items, the one at the edge compressing as it leaves. */
export function uncontainedKeylines(
  space: number,
  itemSize: number,
  itemSpacing: number,
): KeylineList {
  if (space === 0 || itemSize === 0) return EMPTY_KEYLINES;
  const largeItemSize = Math.min(itemSize + itemSpacing, space);
  const largeCount = Math.max(1, Math.floor(space / largeItemSize));
  const remainingSpace = space - largeCount * largeItemSize;
  const mediumCount = remainingSpace > 0 ? 1 : 0;
  const mediumSize = calculateMediumChildSize(ANCHOR_SIZE, largeItemSize, remainingSpace);
  const arrangement: Arrangement = {
    priority: 0,
    smallSize: 0,
    smallCount: 0,
    mediumSize,
    mediumCount,
    largeSize: largeItemSize,
    largeCount,
  };
  const xSmallSize = Math.min(ANCHOR_SIZE, itemSize);
  const leftAnchor = Math.max(xSmallSize, mediumSize * 0.5);
  return leftAligned(space, itemSpacing, leftAnchor, ANCHOR_SIZE, arrangement);
}

/** `heroKeylineList`: one large item, centred between two small ones when `centered`. */
export function heroKeylines(
  space: number,
  preferredItemSize: number | undefined,
  itemSpacing: number,
  itemCount: number,
  centered: boolean,
  small: SmallRange = { min: MIN_SMALL_ITEM_SIZE, max: MAX_SMALL_ITEM_SIZE },
): KeylineList {
  if (space === 0) return EMPTY_KEYLINES;
  const shouldCenter = centered && itemCount >= 3;
  let smallCounts = itemCount <= 1 ? [0] : shouldCenter ? [2] : [1];
  const targetLargeSize = Math.min(preferredItemSize ?? space, space);
  const targetSmallSize = Math.min(small.max, Math.max(small.min, targetLargeSize / 3));
  const fullscreenThreshold = small.min * Math.max(...smallCounts) + small.min * 1.25;
  if (space < fullscreenThreshold) smallCounts = [0];
  const minAvailableLargeSpace = space - small.min * Math.max(...smallCounts);
  const minLargeCount = Math.max(1, Math.floor(minAvailableLargeSpace / targetLargeSize));
  const maxLargeCount = Math.ceil(space / targetLargeSize);
  const arrangement = findLowestCostArrangement({
    availableSpace: space,
    itemSpacing,
    targetSmallSize,
    small,
    smallCounts,
    targetMediumSize: 0,
    mediumCounts: [0],
    targetLargeSize,
    largeCounts: descending(maxLargeCount, minLargeCount),
  });
  if (!arrangement) return EMPTY_KEYLINES;
  return shouldCenter && itemCount >= itemCountOf(arrangement)
    ? centerAligned(space, itemSpacing, ANCHOR_SIZE, ANCHOR_SIZE, arrangement)
    : leftAligned(space, itemSpacing, ANCHOR_SIZE, ANCHOR_SIZE, arrangement);
}
