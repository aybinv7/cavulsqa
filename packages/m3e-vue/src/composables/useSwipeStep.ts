import { nextTick, type Ref } from "vue";
import { useHaptics } from "./services.js";
import { useReducedMotion } from "./useReducedMotion.js";
import { useSwipeReveal } from "./useSwipeReveal.js";
import { pageTarget } from "../utils/photoZoom.js";

/** One step of a swipe: 1 toward what follows (the content swiped toward the start), -1 back. */
export type SwipeStep = 1 | -1;

export interface SwipeStepOptions {
  target: Ref<HTMLElement | null | undefined>;
  /** Go one step; resolves once the new content is in place, so it can slide in. */
  onStep: (step: SwipeStep) => void | Promise<void>;
  /** Whether a step that way exists - at an end the drag resists and springs back. */
  canStep?: (step: SwipeStep) => boolean;
  enabled?: () => boolean;
}

const EDGE_RESISTANCE = 0.25;
const ENTRY_FRACTION = 0.3;

/**
 * Previous and next by swiping the content itself - a day in an agenda, a record in a list. The
 * content follows the finger; past a quarter of its width, or on a flick, it leaves toward the
 * swipe, the step runs, and what replaces it slides in from the other side. Anything shorter
 * springs back. Vertical scrolling stays native, and the step mirrors under right-to-left.
 * Reduced motion changes the content in place.
 */
export function useSwipeStep(options: SwipeStepOptions) {
  const haptics = useHaptics();
  const reduced = useReducedMotion();
  let physical = 1;
  let busy = false;

  function move(x: number, transition = "none", opacity = "") {
    const element = options.target.value;
    if (!element) return;
    element.style.transition = transition;
    element.style.transform = x === 0 ? "" : `translate3d(${x}px, 0, 0)`;
    element.style.opacity = opacity;
  }

  function settled(element: HTMLElement, budget: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        element.removeEventListener("transitionend", done);
        resolve();
      };
      const timer = setTimeout(done, budget);
      element.addEventListener("transitionend", done);
    });
  }

  async function step(direction: SwipeStep, width: number) {
    const element = options.target.value;
    if (!element) return;
    busy = true;
    haptics.tick();
    try {
      if (reduced.value) {
        move(0);
        await options.onStep(direction);
        return;
      }
      move(
        -direction * width * physical,
        "transform var(--md-sys-motion-duration-short4, 200ms) var(--md-sys-motion-easing-emphasized-accelerate), opacity var(--md-sys-motion-duration-short4, 200ms) linear",
        "0",
      );
      await settled(element, 260);
      await options.onStep(direction);
      await nextTick();
      move(direction * width * ENTRY_FRACTION * physical, "none", "0");
      void element.offsetWidth;
      move(
        0,
        "transform var(--md-sys-motion-duration-medium2, 300ms) var(--md-sys-motion-easing-emphasized-decelerate), opacity var(--md-sys-motion-duration-medium2, 300ms) linear",
      );
      await settled(element, 360);
      move(0);
    } finally {
      busy = false;
    }
  }

  useSwipeReveal({
    row: options.target,
    enabled: () => !busy && (options.enabled?.() ?? true),
    onStart() {
      const element = options.target.value;
      physical = element && getComputedStyle(element).direction === "rtl" ? -1 : 1;
      return 0;
    },
    onMove(offset) {
      const direction: SwipeStep = offset < 0 ? 1 : -1;
      const open = options.canStep?.(direction) ?? true;
      move(offset * (open ? 1 : EDGE_RESISTANCE) * physical);
    },
    onEnd(offset, velocity) {
      const width = options.target.value?.clientWidth || 1;
      const direction = (pageTarget(1, 3, offset, velocity, width) - 1) as -1 | 0 | 1;
      if (direction === 0 || !(options.canStep?.(direction) ?? true)) {
        move(
          0,
          "transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial)",
        );
        return;
      }
      void step(direction, width);
    },
  });
}
