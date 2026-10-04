import { onScopeDispose, watch, type Ref } from "vue";
import { scrolledAncestor } from "../utils/scroll.js";
import { createVelocityTracker } from "./useVelocity.js";

export interface DetentGestureOptions {
  sheet: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  /** True once the sheet is fully open: an upward drag on its content then scrolls the content. */
  contentScrolls: () => boolean;
  /** The offsets the drag is held between - the top and bottom anchors. */
  bounds: () => { min: number; max: number };
  onDragStart: () => number;
  onDrag: (offset: number) => void;
  onRelease: (offset: number, velocity: number, from: number) => void;
}

const SLOP = 6;

/**
 * Drags a standard bottom sheet between its detents, with Compose's nested-scroll handoff: until the
 * sheet is fully open, a drag anywhere on it moves the sheet; once it is, an upward drag scrolls the
 * content, and a downward drag moves the sheet only when the content is at its top. A horizontal
 * drag and content marked `data-sheet-ignore` are left alone. Touch uses non-passive touch events,
 * the only way to keep a drag the browser would otherwise claim for scrolling; a mouse uses pointer
 * events.
 */
export function useDetentGesture(options: DetentGestureOptions) {
  const tracker = createVelocityTracker();
  let startX = 0;
  let startY = 0;
  let base = 0;
  let from = 0;
  let offset = 0;
  let tracking = false;
  let dragging = false;
  let fromHandle = false;
  let scrolled = false;

  const begin = (x: number, y: number, target: EventTarget | null) => {
    const sheet = options.sheet.value;
    if (!sheet || !options.enabled()) return;
    if (target instanceof Element && target.closest("[data-sheet-ignore]")) return;
    tracking = true;
    dragging = false;
    fromHandle = target instanceof Element && target.closest("[data-sheet-handle]") !== null;
    scrolled = scrolledAncestor(target, sheet);
    startX = x;
    startY = y;
    tracker.reset();
    tracker.add(y);
  };

  const claims = (dy: number) => {
    if (fromHandle || !options.contentScrolls()) return true;
    return dy > 0 && !scrolled;
  };

  const move = (x: number, y: number): boolean => {
    if (!tracking) return false;
    const dy = y - startY;
    if (!dragging) {
      if (Math.abs(dy) < SLOP && Math.abs(x - startX) < SLOP) return false;
      if (Math.abs(x - startX) > Math.abs(dy) || !claims(dy)) {
        tracking = false;
        return false;
      }
      dragging = true;
      base = options.onDragStart();
      from = base;
      startY = y;
    }
    tracker.add(y);
    const { min, max } = options.bounds();
    offset = Math.min(max, Math.max(min, base + (y - startY)));
    options.onDrag(offset);
    return true;
  };

  const end = () => {
    if (dragging) options.onRelease(offset, tracker.velocity(), from);
    tracking = false;
    dragging = false;
  };

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]!;
    begin(touch.clientX, touch.clientY, event.target);
  };
  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0]!;
    if (move(touch.clientX, touch.clientY) && event.cancelable) event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent) => move(event.clientX, event.clientY);
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    end();
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    begin(event.clientX, event.clientY, event.target);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const attach = (sheet: HTMLElement) => {
    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", end, { passive: true });
    sheet.addEventListener("touchcancel", end, { passive: true });
    sheet.addEventListener("pointerdown", onPointerDown);
  };

  const detach = (sheet: HTMLElement) => {
    sheet.removeEventListener("touchstart", onTouchStart);
    sheet.removeEventListener("touchmove", onTouchMove);
    sheet.removeEventListener("touchend", end);
    sheet.removeEventListener("touchcancel", end);
    sheet.removeEventListener("pointerdown", onPointerDown);
  };

  watch(
    options.sheet,
    (sheet, previous) => {
      if (previous) detach(previous);
      if (sheet) attach(sheet);
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    if (options.sheet.value) detach(options.sheet.value);
    window.removeEventListener("pointermove", onPointerMove);
  });

  return { isDragging: () => dragging };
}
