import { onScopeDispose, watch, type Ref } from "vue";

export interface WheelScrollOptions {
  target: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  /** A horizontal wheel or trackpad step, in px toward the inline end. */
  onDelta: (delta: number) => void;
  /** Called once the wheel has been still for a moment - where a snapping scroller settles. */
  onIdle: () => void;
}

const IDLE_MS = 140;
const LINE_PX = 40;

/**
 * Horizontal trackpad and mouse-wheel input for an element that scrolls itself: a sideways
 * gesture, or a vertical wheel with Shift held. A plain vertical wheel is left to the page.
 */
export function useWheelScroll(options: WheelScrollOptions) {
  let idle: ReturnType<typeof setTimeout> | undefined;

  function onWheel(event: WheelEvent) {
    if (!options.enabled()) return;
    const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const raw = sideways ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (raw === 0) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? 400 : 1;
    const rtl = getComputedStyle(event.currentTarget as Element).direction === "rtl";
    options.onDelta(raw * unit * (rtl ? -1 : 1));
    clearTimeout(idle);
    idle = setTimeout(options.onIdle, IDLE_MS);
  }

  watch(
    options.target,
    (target, previous) => {
      previous?.removeEventListener("wheel", onWheel);
      target?.addEventListener("wheel", onWheel, { passive: false });
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    clearTimeout(idle);
    options.target.value?.removeEventListener("wheel", onWheel);
  });
}
