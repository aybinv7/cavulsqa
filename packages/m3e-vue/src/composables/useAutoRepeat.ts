import { onScopeDispose } from "vue";

export interface AutoRepeatOptions {
  /** Called on a tap and on every repeat of a hold, with how long the press has been held. */
  onStep: (heldMs: number) => boolean;
  delay?: number;
  interval?: number;
  /** How far the pointer may travel, in CSS pixels, before the press counts as a scroll. */
  slop?: number;
}

/**
 * Press-and-hold repetition for a button, safe inside a scrolling list. Nothing happens on press:
 * a tap steps once on its click, and a press held still for `delay` steps then repeats every
 * `interval` until the pointer lifts, leaves or is cancelled, or `onStep` reports a bound. A press
 * that travels past `slop` - a finger that lands on the button to scroll the page - never steps.
 * Returns the pointerdown handler and a check for whether a click must be ignored, so keyboard and
 * assistive activation still step exactly once.
 */
export function useAutoRepeat(options: AutoRepeatOptions) {
  const delay = options.delay ?? 400;
  const interval = options.interval ?? 100;
  const slop = options.slop ?? 10;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startedAt = 0;
  let startX = 0;
  let startY = 0;
  let pointer: number | null = null;
  let swallow = false;

  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
    pointer = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", cancel);
  };

  const tick = () => {
    swallow = true;
    if (!options.onStep(performance.now() - startedAt)) {
      stop();
      return;
    }
    timer = setTimeout(tick, interval);
  };

  function cancel() {
    swallow = true;
    stop();
  }

  function onMove(event: PointerEvent) {
    if (pointer === null || event.pointerId !== pointer) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > slop) cancel();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || event.isPrimary === false) return;
    stop();
    swallow = false;
    pointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startedAt = performance.now();
    timer = setTimeout(tick, delay);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", cancel);
  }

  /** True when this click ends a hold that already stepped, or a press that turned into a drag. */
  function consumedByPress(event: MouseEvent): boolean {
    const handled = swallow && event.detail > 0;
    swallow = false;
    return handled;
  }

  onScopeDispose(stop);
  return { onPointerDown, onPointerLeave: stop, consumedByPress };
}
