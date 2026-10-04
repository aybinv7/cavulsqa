import { onScopeDispose, shallowRef, type Ref } from "vue";

export interface ChartScrubOptions {
  target: Ref<Element | null | undefined>;
  count: () => number;
  /** The category under a horizontal position in the target, or -1 outside the plot. */
  indexAt: (x: number) => number;
}

const TOUCH_LINGER_MS = 1600;

/**
 * Which category a chart shows the values of: the one under the mouse, or under the finger while
 * it moves - lingering a moment after the finger lifts so the numbers can be read. The arrow keys
 * step through categories when the chart has focus, and Escape clears it.
 */
export function useChartScrub(options: ChartScrubOptions) {
  const active = shallowRef(-1);
  let linger: ReturnType<typeof setTimeout> | undefined;

  function at(event: PointerEvent) {
    const rect = options.target.value?.getBoundingClientRect();
    if (!rect) return;
    clearTimeout(linger);
    active.value = options.indexAt(event.clientX - rect.left);
  }

  function onPointerDown(event: PointerEvent) {
    at(event);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === "mouse" || event.buttons > 0 || event.pressure > 0) at(event);
  }

  function onPointerLeave(event: PointerEvent) {
    if (event.pointerType === "mouse") active.value = -1;
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerType === "mouse") return;
    clearTimeout(linger);
    linger = setTimeout(() => (active.value = -1), TOUCH_LINGER_MS);
  }

  function onKeydown(event: KeyboardEvent) {
    const count = options.count();
    if (count === 0) return;
    const moves: Record<string, number> = {
      ArrowRight: active.value + 1,
      ArrowLeft: active.value < 0 ? count - 1 : active.value - 1,
      Home: 0,
      End: count - 1,
    };
    if (event.key === "Escape") {
      active.value = -1;
      return;
    }
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    active.value = Math.min(count - 1, Math.max(0, next));
  }

  onScopeDispose(() => clearTimeout(linger));

  return {
    active,
    handlers: { onPointerDown, onPointerMove, onPointerLeave, onPointerUp, onKeydown },
  };
}
