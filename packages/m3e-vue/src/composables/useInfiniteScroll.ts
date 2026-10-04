import { nextTick, onScopeDispose, shallowRef, watch, type Ref } from "vue";
import { scrollableAncestor } from "../utils/scroll.js";

export type InfiniteState = "idle" | "loading" | "error" | "done";

export interface InfiniteScrollOptions {
  sentinel: Ref<HTMLElement | null | undefined>;
  /** Loads the next page; resolve `false` when there is nothing more. */
  load: () => Promise<boolean | void>;
  /** How far before the end, in px, the next page starts loading. */
  distance?: () => number;
  /** Which end of the scroller the sentinel sits at - `start` for history loaded above. */
  edge?: () => "start" | "end";
  enabled: () => boolean;
}

/**
 * Framework7's infinite scroll on an IntersectionObserver rooted at the real scroller, so nothing
 * runs per scroll event. One load at a time; once a page lands, if the sentinel is still within
 * reach - the content is shorter than the screen - the next one follows. A failed load stops
 * until `retry()`, so a dropped connection does not hammer the server.
 */
export function useInfiniteScroll(options: InfiniteScrollOptions) {
  const state = shallowRef<InfiniteState>("idle");
  let observer: IntersectionObserver | null = null;
  let root: HTMLElement | null = null;

  const distance = () => options.distance?.() ?? 200;
  const atStart = () => options.edge?.() === "start";

  function withinReach(): boolean {
    const sentinel = options.sentinel.value;
    if (!sentinel) return false;
    const box = sentinel.getBoundingClientRect();
    if (atStart()) {
      const top = root ? root.getBoundingClientRect().top : 0;
      return box.bottom >= top - distance();
    }
    const bottom = root ? root.getBoundingClientRect().bottom : window.innerHeight;
    return box.top <= bottom + distance();
  }

  async function run() {
    if (state.value !== "idle" || !options.enabled()) return;
    state.value = "loading";
    try {
      const more = await options.load();
      state.value = more === false ? "done" : "idle";
    } catch {
      state.value = "error";
      return;
    }
    await nextTick();
    if (state.value === "idle" && withinReach()) void run();
  }

  function retry() {
    if (state.value === "error") state.value = "idle";
    void run();
  }

  function reset() {
    state.value = "idle";
    void nextTick(() => {
      if (withinReach()) void run();
    });
  }

  function observe(sentinel: HTMLElement) {
    observer?.disconnect();
    root = scrollableAncestor(sentinel);
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void run();
      },
      {
        root,
        rootMargin: atStart() ? `${distance()}px 0px 0px 0px` : `0px 0px ${distance()}px 0px`,
      },
    );
    observer.observe(sentinel);
  }

  watch(
    options.sentinel,
    (sentinel) => {
      observer?.disconnect();
      observer = null;
      if (sentinel && typeof IntersectionObserver !== "undefined") observe(sentinel);
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => observer?.disconnect());

  return { state, retry, reset };
}
