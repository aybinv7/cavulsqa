import { onScopeDispose, shallowRef, watch, type Ref } from "vue";
import { nextHideState, type HideState } from "../utils/scrollHide.js";

export interface HideOnScrollOptions {
  /** Pixels of movement in one direction before the state flips. */
  threshold?: number;
  enabled?: () => boolean;
}

/**
 * Whether a bar should be out of the way of `scroller`'s content right now - Material's
 * hide-on-scroll: down hides it, up brings it back, and it shows at the top and the very end.
 * Reads the scroller once per frame through a passive listener; nothing re-renders while the
 * state holds.
 */
export function useHideOnScroll(
  scroller: Ref<HTMLElement | null | undefined>,
  options: HideOnScrollOptions = {},
) {
  const hidden = shallowRef(false);
  let state: HideState = { hidden: false, travel: 0 };
  let last = 0;
  let frame = 0;
  let current: HTMLElement | null = null;

  function read() {
    frame = 0;
    const element = current;
    if (!element) return;
    const top = Math.max(0, element.scrollTop);
    if (options.enabled && !options.enabled()) {
      state = { hidden: false, travel: 0 };
      last = top;
      hidden.value = false;
      return;
    }
    state = nextHideState(
      state,
      top - last,
      { top, max: element.scrollHeight - element.clientHeight },
      options.threshold,
    );
    last = top;
    if (hidden.value !== state.hidden) hidden.value = state.hidden;
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(read);
  };

  function detach() {
    current?.removeEventListener("scroll", schedule);
    current = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  watch(
    scroller,
    (element) => {
      detach();
      state = { hidden: false, travel: 0 };
      hidden.value = false;
      if (!element) return;
      current = element;
      last = element.scrollTop;
      element.addEventListener("scroll", schedule, { passive: true });
    },
    { immediate: true, flush: "post" },
  );

  onScopeDispose(detach);

  return {
    hidden,
    reset() {
      state = { hidden: false, travel: 0 };
      hidden.value = false;
    },
  };
}
