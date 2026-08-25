// Shell-level state: the tab bar is rendered by the shell, but what hides it (a keyboard, a full
// screen page) happens elsewhere in the tree.
const keyboardOpen = ref(false);
const hiddenRequests = ref(0);

export interface TabbarVisibility {
  isVisible: ComputedRef<boolean>;
  setKeyboardOpen: (open: boolean) => void;
  hideTabbar: () => () => void;
}

export function useTabbarVisibility(): TabbarVisibility {
  return {
    isVisible: computed(() => !keyboardOpen.value && hiddenRequests.value === 0),
    setKeyboardOpen: (open: boolean) => {
      keyboardOpen.value = open;
    },
    /** Hide the bar for as long as the caller needs it; the returned function restores it. */
    hideTabbar: () => {
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
