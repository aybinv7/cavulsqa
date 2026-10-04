import { onScopeDispose, watch, type Ref } from "vue";

export interface PullGestureOptions {
  scroller: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  onPull: (distance: number) => void;
  onRelease: (distance: number) => void;
}

const SLOP = 8;

/**
 * A downward pull on a scroller that is already at its top. Touch events, because a pointer
 * gesture over scrollable content is cancelled the moment the browser decides to scroll; calling
 * `preventDefault` on `touchmove` once the pull is ours is the only way to keep it. An upward
 * move, or one that starts below the top, is left to native scrolling untouched.
 */
export function usePullGesture(options: PullGestureOptions) {
  let startY = 0;
  let startX = 0;
  let tracking = false;
  let pulling = false;
  let distance = 0;

  const onStart = (event: TouchEvent) => {
    const element = options.scroller.value;
    if (!element || !options.enabled() || event.touches.length !== 1 || element.scrollTop > 0)
      return;
    tracking = true;
    pulling = false;
    startY = event.touches[0]!.clientY;
    startX = event.touches[0]!.clientX;
  };

  const onMove = (event: TouchEvent) => {
    if (!tracking) return;
    const touch = event.touches[0]!;
    const dy = touch.clientY - startY;
    const dx = touch.clientX - startX;
    if (!pulling) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || (options.scroller.value?.scrollTop ?? 0) > 0) {
        tracking = false;
        return;
      }
      pulling = true;
      startY = touch.clientY;
    }
    distance = Math.max(0, touch.clientY - startY);
    if (event.cancelable) event.preventDefault();
    options.onPull(distance);
  };

  const onEnd = () => {
    if (pulling) options.onRelease(distance);
    tracking = false;
    pulling = false;
    distance = 0;
  };

  const detach = (element: HTMLElement) => {
    element.removeEventListener("touchstart", onStart);
    element.removeEventListener("touchmove", onMove);
    element.removeEventListener("touchend", onEnd);
    element.removeEventListener("touchcancel", onEnd);
  };

  watch(
    options.scroller,
    (element, previous) => {
      if (previous) detach(previous);
      if (!element) return;
      element.addEventListener("touchstart", onStart, { passive: true });
      element.addEventListener("touchmove", onMove, { passive: false });
      element.addEventListener("touchend", onEnd, { passive: true });
      element.addEventListener("touchcancel", onEnd, { passive: true });
    },
    { immediate: true, flush: "post" },
  );

  onScopeDispose(() => {
    if (options.scroller.value) detach(options.scroller.value);
  });
}
