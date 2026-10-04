import { computed, onMounted, onUnmounted, shallowRef, type ComputedRef } from "vue";

const keyboardOpen = shallowRef(false);
const scrollHidden = shallowRef(false);
const hiddenRequests = shallowRef(0);

export interface NavigationVisibility {
  isVisible: ComputedRef<boolean>;
  /**
   * Whether the bar keeps its row in the layout. Hiding on scroll only slides it away: taking the
   * row back would change the content's height under the finger, and near the end of a page that
   * moves the scroll position, which shows the bar again, which moves it back.
   */
  isReserved: ComputedRef<boolean>;
  setKeyboardOpen: (open: boolean) => void;
  /** Hide-on-scroll: the page on screen is scrolling its content down. */
  setScrollHidden: (hidden: boolean) => void;
  /** Hides the bar until the returned function is called. Calls are counted, not toggled. */
  hide: () => () => void;
}

/**
 * Whether the compact navigation bar is on screen. The bar is the shell's, but what hides it - the
 * keyboard, a pushed page - happens deep in the tree, so the state is shared rather than local.
 */
export function useNavigationVisibility(): NavigationVisibility {
  return {
    isVisible: computed(
      () => !keyboardOpen.value && !scrollHidden.value && hiddenRequests.value === 0,
    ),
    isReserved: computed(() => !keyboardOpen.value && hiddenRequests.value === 0),
    setKeyboardOpen: (open) => {
      keyboardOpen.value = open;
    },
    setScrollHidden: (hidden) => {
      if (scrollHidden.value !== hidden) scrollHidden.value = hidden;
    },
    hide: () => {
      hiddenRequests.value += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        hiddenRequests.value -= 1;
      };
    },
  };
}

/**
 * For a pushed page: the bar leaves while it is mounted. The bar navigates between top-level
 * destinations; on a detail screen it points somewhere you are not and steals a row from content.
 */
export function useHiddenNavigation(): void {
  const { hide } = useNavigationVisibility();
  let release: (() => void) | null = null;
  onMounted(() => {
    release = hide();
  });
  onUnmounted(() => {
    release?.();
    release = null;
  });
}
