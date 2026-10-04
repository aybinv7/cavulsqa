import { onScopeDispose, watch, type Ref } from "vue";
import { scrolledAncestor } from "../utils/scroll.js";
import { createVelocityTracker } from "./useVelocity.js";

export interface SheetGestureOptions {
  sheet: Ref<HTMLElement | null | undefined>;
  /**
   * The elements that listen for the drag; the whole sheet by default. Listening only on the
   * handle keeps the blocking `touchmove` listener off the content, so the browser never waits for
   * script before scrolling it - what a sheet full of wheels or long lists needs.
   */
  surfaces?: () => readonly (HTMLElement | null | undefined)[];
  enabled: () => boolean;
  /** The sheet's offset from open, in px; the gesture writes it while dragging. */
  onDrag: (offset: number) => void;
  onDragStart: () => number;
  onRelease: (offset: number, velocity: number) => void;
}

const SLOP = 6;

/**
 * Drag a sheet down to dismiss it, from its handle or from content that is scrolled to the top.
 * Content marked `data-sheet-ignore` - a wheel, a horizontal carousel - keeps its own gestures.
 * Touch uses touch events, because a pointer drag inside scrollable content is cancelled the moment
 * the browser starts panning; `preventDefault` on `touchmove` is the only way to keep it. A mouse
 * uses pointer events. The sheet stops at its open position, as Compose's anchors do; dragging
 * further up does nothing.
 */
export function useSheetGesture(options: SheetGestureOptions) {
  const tracker = createVelocityTracker();
  let startY = 0;
  let base = 0;
  let tracking = false;
  let dragging = false;
  let blocked = false;
  let fromHandle = false;
  let offset = 0;

  const begin = (y: number, target: EventTarget | null, time: number) => {
    const sheet = options.sheet.value;
    if (!sheet || !options.enabled()) return;
    if (target instanceof Element && target.closest("[data-sheet-ignore]")) return;
    tracking = true;
    dragging = false;
    blocked = scrolledAncestor(target, sheet);
    fromHandle = target instanceof Element && target.closest("[data-sheet-handle]") !== null;
    startY = y;
    tracker.reset();
    tracker.add(y, time);
  };

  const move = (y: number, time: number): boolean => {
    if (!tracking || blocked) return false;
    const dy = y - startY;
    if (!dragging) {
      if (Math.abs(dy) < SLOP) return false;
      if (dy < 0 && !fromHandle) {
        blocked = true;
        return false;
      }
      dragging = true;
      base = options.onDragStart();
      startY = y;
    }
    tracker.add(y, time);
    const raw = base + (y - startY);
    offset = Math.max(0, raw);
    options.onDrag(offset);
    return true;
  };

  const end = () => {
    if (dragging) options.onRelease(offset, tracker.velocity());
    tracking = false;
    dragging = false;
  };

  const onTouchStart = (event: TouchEvent) =>
    begin(event.touches[0]!.clientY, event.target, event.timeStamp);
  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    if (move(event.touches[0]!.clientY, event.timeStamp) && event.cancelable)
      event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    begin(event.clientY, event.target, event.timeStamp);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };
  const onPointerMove = (event: PointerEvent) => move(event.clientY, event.timeStamp);
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    end();
  };

  const detach = (sheet: HTMLElement) => {
    sheet.removeEventListener("touchstart", onTouchStart);
    sheet.removeEventListener("touchmove", onTouchMove);
    sheet.removeEventListener("touchend", end);
    sheet.removeEventListener("touchcancel", end);
    sheet.removeEventListener("pointerdown", onPointerDown);
  };

  const attach = (surface: HTMLElement) => {
    surface.addEventListener("touchstart", onTouchStart, { passive: true });
    surface.addEventListener("touchmove", onTouchMove, { passive: false });
    surface.addEventListener("touchend", end, { passive: true });
    surface.addEventListener("touchcancel", end, { passive: true });
    surface.addEventListener("pointerdown", onPointerDown);
  };

  let attached: HTMLElement[] = [];
  watch(
    () =>
      (options.surfaces ? options.surfaces() : [options.sheet.value]).filter(
        (surface): surface is HTMLElement => surface instanceof HTMLElement,
      ),
    (surfaces) => {
      attached.forEach(detach);
      surfaces.forEach(attach);
      attached = surfaces;
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    attached.forEach(detach);
    attached = [];
    window.removeEventListener("pointermove", onPointerMove);
  });
}
