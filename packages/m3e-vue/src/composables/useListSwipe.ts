import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { onScopeDispose, watch, type ModelRef, type Ref } from "vue";
import { useHaptics } from "./services.js";
import { useReducedMotion } from "./useReducedMotion.js";
import { useSwipeReveal } from "./useSwipeReveal.js";
import {
  fullSwipeArmed,
  openOffset,
  settleSwipe,
  swipeOffset,
  type SwipeLimits,
  type SwipeSide,
} from "../utils/swipe.js";

export interface ListSwipeOptions {
  item: Ref<HTMLElement | null | undefined>;
  row: Ref<HTMLElement | null | undefined>;
  start: Ref<HTMLElement | null | undefined>;
  end: Ref<HTMLElement | null | undefined>;
  swiped: ModelRef<SwipeSide | null | undefined>;
  full: () => "start" | "end" | "both" | undefined;
  enabled: () => boolean;
  /** Runs the action whose root element is given - the outermost one, on a full swipe. */
  fire: (action: HTMLElement) => void;
}

const ACTION_WIDTH = 72;
const RESTORE_AFTER_FULL_MS = 280;

let openRow: { close: () => void } | null = null;

/**
 * Swipe actions on one list row. The row and the two action strips are moved by writing styles
 * directly on each frame - nothing re-renders while a finger is down - and settle on the default
 * spatial spring carrying the release velocity. One row is open at a time: opening another, or
 * touching anywhere outside, closes it. A full swipe slides the row out and runs the outermost
 * action's handler, so the app handles it exactly like a tap on that action.
 */
export function useListSwipe(options: ListSwipeOptions) {
  const haptics = useHaptics();
  const reduced = useReducedMotion();
  const spring = MOTION_SCHEMES.expressive.defaultSpatial.spring;
  let offset = 0;
  let armed = false;
  let animation: SpringAnimation | null = null;
  let restoreTimer = 0;
  let settling: SwipeSide | null | undefined;

  const self = { close: () => (options.swiped.value = null) };

  function limits(): SwipeLimits {
    const full = options.full();
    return {
      startWidth: (options.start.value?.childElementCount ?? 0) * ACTION_WIDTH,
      endWidth: (options.end.value?.childElementCount ?? 0) * ACTION_WIDTH,
      rowWidth: options.row.value?.offsetWidth ?? 0,
      fullStart: full === "start" || full === "both",
      fullEnd: full === "end" || full === "both",
    };
  }

  function direction(): number {
    const row = options.row.value;
    return row && getComputedStyle(row).direction === "rtl" ? -1 : 1;
  }

  function apply(next: number, bounds: SwipeLimits) {
    offset = next;
    const row = options.row.value;
    if (row) row.style.transform = next === 0 ? "" : `translate3d(${next * direction()}px, 0, 0)`;
    if (options.start.value) options.start.value.style.width = `${Math.max(0, next)}px`;
    if (options.end.value) options.end.value.style.width = `${Math.max(0, -next)}px`;
    options.item.value?.classList.toggle("m3-list-item--swiping", next !== 0);
    const nowArmed = fullSwipeArmed(next, bounds);
    if (nowArmed !== armed) {
      armed = nowArmed;
      options.start.value?.classList.toggle("m3-list-item__swipe--armed", armed && next > 0);
      options.end.value?.classList.toggle("m3-list-item__swipe--armed", armed && next < 0);
      if (armed) haptics.confirm();
      else haptics.tick();
    }
  }

  function animateTo(target: number, velocity = 0): Promise<boolean> {
    animation?.stop();
    const bounds = limits();
    animation = animateSpring({
      from: offset,
      to: target,
      spring,
      velocity,
      instant: reduced.value,
      onFrame: (value) => apply(value, bounds),
    });
    return animation.finished;
  }

  function outermost(side: SwipeSide): HTMLElement | null {
    const strip = side === "start" ? options.start.value : options.end.value;
    const actions = strip?.querySelectorAll<HTMLElement>(":scope > .m3-swipe-action") ?? [];
    return (side === "start" ? actions[0] : actions[actions.length - 1]) ?? null;
  }

  async function fullSwipe(side: SwipeSide, velocity: number) {
    const bounds = limits();
    const target = side === "start" ? bounds.rowWidth : -bounds.rowWidth;
    if (!(await animateTo(target, velocity))) return;
    const action = outermost(side);
    if (action) options.fire(action);
    restoreTimer = window.setTimeout(() => {
      options.swiped.value = null;
      void animateTo(0);
    }, RESTORE_AFTER_FULL_MS);
  }

  function onOutside(event: PointerEvent) {
    if (options.item.value?.contains(event.target as Node)) return;
    options.swiped.value = null;
  }

  function listenOutside(open: boolean) {
    if (open) document.addEventListener("pointerdown", onOutside, { capture: true, passive: true });
    else document.removeEventListener("pointerdown", onOutside, { capture: true });
  }

  useSwipeReveal({
    row: options.row,
    enabled: options.enabled,
    onStart() {
      animation?.stop();
      clearTimeout(restoreTimer);
      if (openRow && openRow !== self) openRow.close();
      return offset;
    },
    onMove(raw) {
      const bounds = limits();
      apply(swipeOffset(raw, bounds), bounds);
    },
    onEnd(released, velocity) {
      const bounds = limits();
      const outcome = settleSwipe(released, velocity, bounds);
      if (outcome === "full-start" || outcome === "full-end") {
        void fullSwipe(outcome === "full-start" ? "start" : "end", velocity);
        return;
      }
      settling = outcome === (options.swiped.value ?? null) ? undefined : outcome;
      void animateTo(openOffset(outcome, bounds), velocity);
      options.swiped.value = outcome;
    },
  });

  watch(
    () => options.swiped.value ?? null,
    (side) => {
      if (side && openRow !== self) {
        openRow?.close();
        openRow = self;
      }
      if (!side && openRow === self) openRow = null;
      listenOutside(side !== null);
      if (settling === side) {
        settling = undefined;
        return;
      }
      settling = undefined;
      void animateTo(openOffset(side, limits()));
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    animation?.stop();
    clearTimeout(restoreTimer);
    listenOutside(false);
    if (openRow === self) openRow = null;
  });
}
