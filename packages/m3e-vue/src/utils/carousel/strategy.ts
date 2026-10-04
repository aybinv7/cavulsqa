import {
  entriesOf,
  firstFocal,
  firstIndexAfterFocalRangeWithSize,
  focalCount,
  isFirstFocalItemAtStartOfContainer,
  isLastFocalItemAtEndOfContainer,
  keylineAfter,
  keylineBefore,
  keylineListOf,
  lastFocal,
  lastIndexBeforeFocalRangeWithSize,
  lerpKeyline,
  lerpKeylineList,
  pivotOf,
  type Keyline,
  type KeylineList,
} from "./keylines.js";

/**
 * androidx `Strategy.kt` and the placement in `Carousel.kt`: the default keylines, the steps that
 * shift them at either end of the scroll so the first and last items can reach the focal range,
 * and where every item sits for a scroll offset. Scroll offsets here are Compose's carousel offset
 * - `item * (size + spacing)` puts that item's slot at the start.
 */
export interface CarouselStrategy {
  defaultKeylines: KeylineList;
  startSteps: KeylineList[];
  endSteps: KeylineList[];
  startShiftDistance: number;
  endShiftDistance: number;
  startShiftPoints: number[];
  endShiftPoints: number[];
  space: number;
  itemSpacing: number;
  itemSize: number;
  minItemSize: number;
  maxItemSize: number;
  isValid: boolean;
}

function moveKeyline(
  from: KeylineList,
  srcIndex: number,
  dstIndex: number,
  space: number,
  spacing: number,
): KeylineList {
  const direction = srcIndex > dstIndex ? 1 : -1;
  const moved = from.keylines[srcIndex]!;
  const delta = (moved.size - moved.cutoff + spacing) * direction;
  const entries = entriesOf(from);
  const [entry] = entries.splice(srcIndex, 1);
  entries.splice(dstIndex, 0, entry!);
  return keylineListOf(space, spacing, entries, {
    pivotIndex: from.pivotIndex + direction,
    pivotOffset: pivotOf(from).offset + delta,
  });
}

function shiftForContentPadding(
  from: KeylineList,
  space: number,
  spacing: number,
  contentPadding: number,
  pivot: Keyline,
  pivotIndex: number,
): KeylineList {
  const sizeReduction =
    contentPadding / from.keylines.filter((keyline) => !keyline.isAnchor).length;
  const shifted = keylineListOf(
    space,
    spacing,
    from.keylines.map((keyline) => ({
      size: keyline.size - Math.abs(sizeReduction),
      isAnchor: keyline.isAnchor,
    })),
    { pivotIndex, pivotOffset: pivot.offset - sizeReduction / 2 + contentPadding },
  );
  return {
    ...shifted,
    keylines: shifted.keylines.map((keyline, index) => ({
      ...keyline,
      unadjustedOffset: from.keylines[index]!.unadjustedOffset,
    })),
  };
}

function startKeylineSteps(
  defaults: KeylineList,
  space: number,
  spacing: number,
  beforePadding: number,
): KeylineList[] {
  if (defaults.keylines.length === 0) return [];
  const steps = [defaults];
  if (isFirstFocalItemAtStartOfContainer(defaults)) {
    if (beforePadding !== 0) {
      steps.push(
        shiftForContentPadding(
          defaults,
          space,
          spacing,
          beforePadding,
          firstFocal(defaults),
          defaults.firstFocalIndex,
        ),
      );
    }
    return steps;
  }
  const startIndex = defaults.firstNonAnchorIndex;
  const count = defaults.firstFocalIndex - startIndex;
  if (count <= 0 && firstFocal(defaults).cutoff > 0) {
    steps.push(moveKeyline(defaults, 0, 0, space, spacing));
    return steps;
  }
  for (let index = 0; index < count; index++) {
    const previous = steps.at(-1)!;
    const originalItemIndex = startIndex + index;
    const dstIndex =
      originalItemIndex > 0
        ? firstIndexAfterFocalRangeWithSize(
            previous,
            defaults.keylines[originalItemIndex - 1]!.size,
          ) - 1
        : defaults.keylines.length - 1;
    steps.push(moveKeyline(previous, defaults.firstNonAnchorIndex, dstIndex, space, spacing));
  }
  if (beforePadding !== 0) {
    const last = steps.at(-1)!;
    steps[steps.length - 1] = shiftForContentPadding(
      last,
      space,
      spacing,
      beforePadding,
      firstFocal(last),
      last.firstFocalIndex,
    );
  }
  return steps;
}

function endKeylineSteps(
  defaults: KeylineList,
  space: number,
  spacing: number,
  afterPadding: number,
): KeylineList[] {
  if (defaults.keylines.length === 0) return [];
  const steps = [defaults];
  if (isLastFocalItemAtEndOfContainer(defaults, space)) {
    if (afterPadding !== 0) {
      steps.push(
        shiftForContentPadding(
          defaults,
          space,
          spacing,
          -afterPadding,
          lastFocal(defaults),
          defaults.lastFocalIndex,
        ),
      );
    }
    return steps;
  }
  const startIndex = defaults.lastFocalIndex;
  const endIndex = defaults.lastNonAnchorIndex;
  const count = endIndex - startIndex;
  if (count <= 0 && lastFocal(defaults).cutoff > 0) {
    steps.push(moveKeyline(defaults, 0, 0, space, spacing));
    return steps;
  }
  for (let index = 0; index < count; index++) {
    const previous = steps.at(-1)!;
    const originalItemIndex = endIndex - index;
    const dstIndex =
      originalItemIndex < defaults.keylines.length - 1
        ? lastIndexBeforeFocalRangeWithSize(
            previous,
            defaults.keylines[originalItemIndex + 1]!.size,
          ) + 1
        : 0;
    steps.push(moveKeyline(previous, defaults.lastNonAnchorIndex, dstIndex, space, spacing));
  }
  if (afterPadding !== 0) {
    const last = steps.at(-1)!;
    steps[steps.length - 1] = shiftForContentPadding(
      last,
      space,
      spacing,
      -afterPadding,
      lastFocal(last),
      last.lastFocalIndex,
    );
  }
  return steps;
}

function stepInterpolationPoints(
  totalShift: number,
  steps: readonly KeylineList[],
  isShiftingLeft: boolean,
): number[] {
  const points = [0];
  if (totalShift === 0 || steps.length === 0) return points;
  for (let index = 1; index < steps.length; index++) {
    const previous = steps[index - 1]!;
    const current = steps[index]!;
    const distance = isShiftingLeft
      ? current.keylines[0]!.unadjustedOffset - previous.keylines[0]!.unadjustedOffset
      : previous.keylines.at(-1)!.unadjustedOffset - current.keylines.at(-1)!.unadjustedOffset;
    points.push(index === steps.length - 1 ? 1 : points[index - 1]! + distance / totalShift);
  }
  return points;
}

export function createStrategy(
  defaults: KeylineList,
  space: number,
  itemSpacing: number,
  beforePadding = 0,
  afterPadding = 0,
): CarouselStrategy {
  const startSteps = startKeylineSteps(defaults, space, itemSpacing, beforePadding);
  const endSteps = endKeylineSteps(defaults, space, itemSpacing, afterPadding);
  const startShiftDistance =
    startSteps.length === 0
      ? 0
      : Math.max(
          startSteps.at(-1)!.keylines[0]!.unadjustedOffset -
            startSteps[0]!.keylines[0]!.unadjustedOffset,
          beforePadding,
        );
  const endShiftDistance =
    endSteps.length === 0
      ? 0
      : Math.max(
          endSteps[0]!.keylines.at(-1)!.unadjustedOffset -
            endSteps.at(-1)!.keylines.at(-1)!.unadjustedOffset,
          afterPadding,
        );
  const itemSize = defaults.keylines.length > 0 ? firstFocal(defaults).size : 0;
  const sizes = [defaults, ...startSteps, ...endSteps].flatMap((list) =>
    list.keylines.map((keyline) => keyline.size),
  );
  return {
    defaultKeylines: defaults,
    startSteps,
    endSteps,
    startShiftDistance,
    endShiftDistance,
    startShiftPoints: stepInterpolationPoints(startShiftDistance, startSteps, true),
    endShiftPoints: stepInterpolationPoints(endShiftDistance, endSteps, false),
    space,
    itemSpacing,
    itemSize,
    minItemSize: sizes.length > 0 ? Math.min(...sizes) : 0,
    maxItemSize: sizes.length > 0 ? Math.max(...sizes) : 0,
    isValid: defaults.keylines.length > 0 && space !== 0 && itemSize !== 0,
  };
}

const clampedLerp = (
  outMin: number,
  outMax: number,
  inMin: number,
  inMax: number,
  value: number,
) => {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
};

export function keylinesForScrollOffset(
  strategy: CarouselStrategy,
  scrollOffset: number,
  maxScrollOffset: number,
): KeylineList {
  const offset = Math.max(0, scrollOffset);
  const startShiftOffset = strategy.startShiftDistance;
  const endShiftOffset = Math.max(0, maxScrollOffset - strategy.endShiftDistance);
  if (offset >= startShiftOffset && offset <= endShiftOffset) return strategy.defaultKeylines;

  let interpolation = clampedLerp(1, 0, 0, startShiftOffset, offset);
  let points = strategy.startShiftPoints;
  let steps = strategy.startSteps;
  if (offset > endShiftOffset) {
    interpolation = clampedLerp(0, 1, endShiftOffset, maxScrollOffset, offset);
    points = strategy.endShiftPoints;
    steps = strategy.endSteps;
    if (endShiftOffset < 0.01 && strategy.startSteps.length === 2 && steps.length === 2) {
      steps = [strategy.startSteps.at(-1)!, strategy.endSteps.at(-1)!];
    }
  }

  let from = 0;
  let to = 0;
  let stepped = 0;
  let lower = points[0]!;
  for (let index = 1; index < steps.length; index++) {
    const upper = points[index]!;
    if (interpolation <= upper) {
      from = index - 1;
      to = index;
      stepped = clampedLerp(0, 1, lower, upper, interpolation);
      break;
    }
    lower = upper;
  }
  return lerpKeylineList(steps[from]!, steps[to]!, stepped);
}

export function maxScrollOffset(strategy: CarouselStrategy, itemCount: number): number {
  const content = strategy.itemSize * itemCount + strategy.itemSpacing * Math.max(0, itemCount - 1);
  return Math.max(0, content - strategy.space);
}

/** `getSnapPositionOffset`: where item `index`'s slot rests when it is the current item. */
export function snapPositionOffset(
  strategy: CarouselStrategy,
  index: number,
  itemCount: number,
): number {
  if (!strategy.isValid) return 0;
  const half = strategy.itemSize / 2;
  let offset = Math.round(firstFocal(strategy.defaultKeylines).unadjustedOffset - half);
  const startLast = strategy.startSteps.length - 1;
  if (index <= startLast) {
    const step = Math.min(startLast, Math.max(0, startLast - index));
    offset = Math.round(firstFocal(strategy.startSteps[step]!).unadjustedOffset - half);
  }
  const lastItemIndex = itemCount - 1;
  const endLast = strategy.endSteps.length - 1;
  if (index >= lastItemIndex - endLast && itemCount > focalCount(strategy.defaultKeylines)) {
    const step = Math.min(endLast, Math.max(0, endLast - (lastItemIndex - index)));
    offset = Math.round(lastFocal(strategy.endSteps[step]!).unadjustedOffset - half);
  }
  return offset;
}

/** The scroll offset that makes `index` the current item, held inside the scroll range. */
export function snapScrollOffset(
  strategy: CarouselStrategy,
  index: number,
  itemCount: number,
): number {
  const raw =
    index * (strategy.itemSize + strategy.itemSpacing) -
    snapPositionOffset(strategy, index, itemCount);
  return Math.min(maxScrollOffset(strategy, itemCount), Math.max(0, raw));
}

export interface ItemPlacement {
  /** The item's centre along the container, after the keyline translation. */
  center: number;
  /** The mask size: how much of the full-size item shows, centred in it. */
  size: number;
}

/** `Modifier.carouselItem`: interpolates the item between the keylines either side of it. */
export function placeItem(
  strategy: CarouselStrategy,
  keylines: KeylineList,
  index: number,
  scrollOffset: number,
): ItemPlacement {
  const unadjustedCenter =
    index * (strategy.itemSize + strategy.itemSpacing) + strategy.itemSize / 2 - scrollOffset;
  const before = keylineBefore(keylines, unadjustedCenter);
  const after = keylineAfter(keylines, unadjustedCenter);
  const outOfBounds = before === after;
  const progress = outOfBounds
    ? 1
    : (unadjustedCenter - before.unadjustedOffset) /
      (after.unadjustedOffset - before.unadjustedOffset);
  const keyline = lerpKeyline(before, after, progress);
  let translation = keyline.offset - unadjustedCenter;
  if (outOfBounds) translation += (unadjustedCenter - keyline.unadjustedOffset) / keyline.size;
  return { center: unadjustedCenter + translation, size: keyline.size };
}
