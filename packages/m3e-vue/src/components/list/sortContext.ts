import type { InjectionKey } from "vue";

/** What a sortable list tells its items: whether to show a drag handle, and what to call it. */
export interface ListSortable {
  enabled: () => boolean;
  label: () => string;
}

export const LIST_SORTABLE: InjectionKey<ListSortable> = Symbol("m3-list-sortable");
