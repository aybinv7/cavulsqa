import { inject, type InjectionKey, type Ref } from "vue";

/** What `M3Pager` shares with its pages: the settled page, the page count, and registration. */
export interface PagerContext {
  current: Ref<number>;
  count: Ref<number>;
  register: (element: HTMLElement) => () => void;
  indexOf: (element: HTMLElement | null) => number;
}

export const PAGER: InjectionKey<PagerContext> = Symbol("m3-pager");

export function usePager(): PagerContext {
  const context = inject(PAGER, null);
  if (!context) throw new Error("M3PagerPage must be placed inside M3Pager");
  return context;
}
