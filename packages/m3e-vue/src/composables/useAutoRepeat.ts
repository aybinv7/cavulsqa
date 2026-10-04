import { onScopeDispose } from "vue";

export interface AutoRepeatOptions {
  /** Called on press and on every repeat with how long the press has been held. */
  onStep: (heldMs: number) => boolean;
  delay?: number;
  interval?: number;
}

/**
 * Press-and-hold repetition for a button: one step on press, then after `delay` a step every
 * `interval` until the pointer lifts, leaves or is cancelled, or `onStep` reports it hit a bound.
 * Returns the pointerdown handler and a check for whether a click was already handled by a press,
 * so keyboard and assistive activation still step exactly once.
 */
export function useAutoRepeat(options: AutoRepeatOptions) {
  const delay = options.delay ?? 400;
  const interval = options.interval ?? 100;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startedAt = 0;
  let pressed = false;

  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  const tick = () => {
    if (!options.onStep(performance.now() - startedAt)) {
      stop();
      return;
    }
    timer = setTimeout(tick, interval);
  };

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || event.isPrimary === false) return;
    stop();
    pressed = true;
    startedAt = performance.now();
    if (!options.onStep(0)) return;
    timer = setTimeout(tick, delay);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  /** True when this click is the tail of a press that already stepped; resets the flag. */
  function consumedByPress(event: MouseEvent): boolean {
    const handled = pressed && event.detail > 0;
    pressed = false;
    return handled;
  }

  onScopeDispose(stop);
  return { onPointerDown, onPointerLeave: stop, consumedByPress };
}
