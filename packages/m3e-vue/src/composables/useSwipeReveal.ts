import { onScopeDispose, watch, type Ref } from "vue";
import { createVelocityTracker } from "./useVelocity.js";

export interface SwipeRevealOptions {
  row: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  /** Called once the drag is known to be horizontal; returns the offset the row starts from. */
  onStart: () => number;
  /** The raw offset under the finger, in the row's inline direction (positive toward the end). */
  onMove: (offset: number) => void;
  onEnd: (offset: number, velocity: number) => void;
}

const SLOP = 8;

/**
 * A horizontal drag on a list row that leaves vertical scrolling to the browser. The row is
 * `touch-action: pan-y`, so the page scrolls natively and only a sideways drag reaches script -
 * through passive pointer events, with no blocking `touchmove` listener for the scroll to wait on.
 * The first movement past the slop decides: mostly vertical and the gesture is abandoned, mostly
 * horizontal and the pointer is captured. The click that ends a drag is swallowed, so swiping a
 * clickable row never opens it.
 */
export function useSwipeReveal(options: SwipeRevealOptions) {
  const tracker = createVelocityTracker();
  let pointer = -1;
  let startX = 0;
  let startY = 0;
  let base = 0;
  let sign = 1;
  let state: "idle" | "pending" | "dragging" = "idle";
  let offset = 0;

  const swallowClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  function onPointerDown(event: PointerEvent) {
    if (event.isPrimary === false || event.button !== 0 || !options.enabled()) return;
    const row = options.row.value;
    if (!row) return;
    pointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    sign = getComputedStyle(row).direction === "rtl" ? -1 : 1;
    state = "pending";
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointer || state === "idle") return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (state === "pending") {
      if (Math.hypot(dx, dy) < SLOP) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        state = "idle";
        return;
      }
      state = "dragging";
      options.row.value?.setPointerCapture(pointer);
      base = options.onStart();
      startX = event.clientX;
      tracker.reset();
    }
    const moved = (event.clientX - startX) * sign;
    tracker.add(event.clientX * sign);
    offset = base + moved;
    options.onMove(offset);
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const wasDragging = state === "dragging";
    state = "idle";
    pointer = -1;
    if (!wasDragging) return;
    const row = options.row.value;
    row?.addEventListener("click", swallowClick, { capture: true, once: true });
    setTimeout(() => row?.removeEventListener("click", swallowClick, { capture: true }), 0);
    options.onEnd(offset, tracker.velocity());
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const wasDragging = state === "dragging";
    state = "idle";
    pointer = -1;
    if (wasDragging) options.onEnd(offset, 0);
  }

  const detach = (row: HTMLElement) => {
    row.removeEventListener("pointerdown", onPointerDown);
    row.removeEventListener("pointermove", onPointerMove);
    row.removeEventListener("pointerup", onPointerUp);
    row.removeEventListener("pointercancel", onPointerCancel);
  };

  watch(
    options.row,
    (row, previous) => {
      if (previous) detach(previous);
      if (!row) return;
      row.addEventListener("pointerdown", onPointerDown, { passive: true });
      row.addEventListener("pointermove", onPointerMove, { passive: true });
      row.addEventListener("pointerup", onPointerUp, { passive: true });
      row.addEventListener("pointercancel", onPointerCancel, { passive: true });
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    if (options.row.value) detach(options.row.value);
  });
}
