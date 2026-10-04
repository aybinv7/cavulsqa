import { inject, type InjectionKey, type Ref } from "vue";

/** What `M3TabPanels` shares with its panels: which one shows, and which are worth rendering. */
export interface TabPanels {
  selected: Ref<string | undefined>;
  rendered: (value: string) => boolean;
  register: (value: string) => () => void;
}

export const TAB_PANELS: InjectionKey<TabPanels> = Symbol("m3-tab-panels");

export function useTabPanels(): TabPanels {
  const context = inject(TAB_PANELS, null);
  if (!context) throw new Error("M3TabPanel must be placed inside M3TabPanels");
  return context;
}
