import { inject, type InjectionKey } from "vue";

export interface ListSwipeContext {
  close: () => void;
  /** Lets a full swipe run an action without clicking an element that is still inert. */
  register: (element: HTMLElement, run: () => void) => void;
  unregister: (element: HTMLElement) => void;
}

export const LIST_SWIPE: InjectionKey<ListSwipeContext> = Symbol("m3-list-swipe");

export function useListSwipeContext(): ListSwipeContext | null {
  return inject(LIST_SWIPE, null);
}
