/** The geometry of dragging one list item past the others, pure so every reorder is testable. */
export interface Slot {
  top: number;
  height: number;
}

export interface SortFrame {
  /** Where the dragged item would land if dropped now. */
  to: number;
  /** How far each item moves aside, in px; the dragged item's own entry is 0. */
  shifts: number[];
}

/** The space between two slots, read from the layout so segmented and standard lists both work. */
export function gapOf(slots: readonly Slot[]): number {
  if (slots.length < 2) return 0;
  return Math.max(0, slots[1]!.top - (slots[0]!.top + slots[0]!.height));
}

/**
 * Items the dragged one has passed - their centre reached by its centre - step aside by its height
 * plus the gap, toward where it came from. Reaching counts, so an item dragged against either end
 * of the list, where the drag is held, still lands first or last.
 */
export function sortFrame(slots: readonly Slot[], from: number, offset: number): SortFrame {
  const dragged = slots[from]!;
  const distance = dragged.height + gapOf(slots);
  const center = dragged.top + offset + dragged.height / 2;
  let to = from;
  const shifts = slots.map((slot, index) => {
    const middle = slot.top + slot.height / 2;
    if (index > from && middle <= center) {
      to = Math.max(to, index);
      return -distance;
    }
    if (index < from && middle >= center) {
      to = Math.min(to, index);
      return distance;
    }
    return 0;
  });
  return { to, shifts };
}

/** The offset that puts the dragged item exactly in slot `to` once the others have moved aside. */
export function dropOffset(slots: readonly Slot[], from: number, to: number): number {
  const dragged = slots[from]!;
  if (to > from) {
    const last = slots[to]!;
    return last.top + last.height - dragged.height - dragged.top;
  }
  return slots[to]!.top - dragged.top;
}

/** A copy of `items` with the one at `from` moved to `to` - what a `sort` handler usually does. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
