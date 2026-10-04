export interface LiftPlacement {
  /** Where the lifted bubble's top goes. */
  top: number;
  /** How far it travels from where it was pressed. */
  shift: number;
  /** Its height once lifted - shorter than the bubble only when the bubble cannot fit. */
  height: number;
  pillTop: number;
  menuTop: number;
}

/**
 * Where a long-pressed bubble, the reaction pill above it and the menu below it go: the bubble stays
 * where it was pressed when all three fit, and otherwise moves the least it must - down from under
 * the app bar, up from behind the keyboard - as iMessage and WhatsApp move it. A bubble taller than
 * the room left keeps its top and is cut short above the menu.
 */
export function liftPlacement(
  bubble: { top: number; height: number },
  sizes: { pill: number; menu: number; gap: number },
  bounds: { top: number; bottom: number },
): LiftPlacement {
  const above = sizes.pill + sizes.gap;
  const below = sizes.menu > 0 ? sizes.gap + sizes.menu : 0;
  const lowest = bounds.top + above;
  const highest = bounds.bottom - below - bubble.height;
  const top = highest >= lowest ? Math.min(highest, Math.max(lowest, bubble.top)) : lowest;
  const height = Math.max(0, Math.min(bubble.height, bounds.bottom - below - top));
  return {
    top,
    shift: top - bubble.top,
    height,
    pillTop: top - above,
    menuTop: top + height + sizes.gap,
  };
}
