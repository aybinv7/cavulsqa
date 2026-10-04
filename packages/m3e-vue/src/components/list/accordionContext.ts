import type { InjectionKey } from "vue";

/** How an `accordion` list keeps one item open: items report opening and closing with their own collapse. */
export interface ListAccordion {
  opened: (collapse: () => void) => void;
  closed: (collapse: () => void) => void;
}

export const LIST_ACCORDION: InjectionKey<ListAccordion> = Symbol("m3-list-accordion");
