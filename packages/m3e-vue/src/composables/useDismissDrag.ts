import { onScopeDispose, watch, type Ref } from "vue";
import { createVelocityTracker } from "./useVelocity.js";

export interface DismissDragOptions {
  target: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  onStart: () => void;
  /** The offset to draw, already resisted where the banner should not go. */
  onMove: (dx: number, dy: number) => void;
  onRelease: (dx: number, dy: number, vx: number, vy: number) => void;
}

const SLOP = 8;
const DOWN_RESISTANCE = 0.2;

/**
 * Drags a banner along whichever axis the gesture starts on: sideways freely, upward freely, and
 * downward only a little against resistance. The click that ends a drag is swallowed, so swiping
 * a notification never opens it.
 */
export function useDismissDrag(options: DismissDragOptions) {
  const xs = createVelocityTracker();
  const ys = createVelocityTracker();
  let pointer = -1;
  let startX = 0;
  let startY = 0;
  let axis: "x" | "y" | null = null;
  let dragged = false;

  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  function offsets(event: PointerEvent): [number, number] {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (axis === "x") return [dx, 0];
    return [0, dy > 0 ? dy * DOWN_RESISTANCE : dy];
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || event.isPrimary === false || !options.enabled()) return;
    pointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    axis = null;
    dragged = false;
    xs.reset();
    ys.reset();
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    if (!axis) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) < SLOP) return;
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      dragged = true;
      options.target.value?.setPointerCapture(pointer);
      options.onStart();
    }
    xs.add(event.clientX, event.timeStamp);
    ys.add(event.clientY, event.timeStamp);
    const [dx, dy] = offsets(event);
    options.onMove(dx, dy);
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    pointer = -1;
    if (!dragged) return;
    const target = options.target.value;
    target?.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => target?.removeEventListener("click", swallow, { capture: true }), 0);
    const [dx, dy] = offsets(event);
    options.onRelease(dx, dy, axis === "x" ? xs.velocity() : 0, axis === "y" ? ys.velocity() : 0);
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    pointer = -1;
    if (dragged) options.onRelease(0, 0, 0, 0);
  }

  const detach = (element: HTMLElement) => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerCancel);
  };

  watch(
    options.target,
    (element, previous) => {
      if (previous) detach(previous);
      if (!element) return;
      element.addEventListener("pointerdown", onPointerDown, { passive: true });
      element.addEventListener("pointermove", onPointerMove, { passive: true });
      element.addEventListener("pointerup", onPointerUp, { passive: true });
      element.addEventListener("pointercancel", onPointerCancel, { passive: true });
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    if (options.target.value) detach(options.target.value);
  });
}
