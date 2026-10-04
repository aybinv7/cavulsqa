import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

export interface TabsContext {
  selected: Ref<string | undefined>;
  variant: ComputedRef<"primary" | "secondary">;
  select: (value: string) => void;
}

export const TABS: InjectionKey<TabsContext> = Symbol("m3-tabs");

export function useTabs(): TabsContext {
  const context = inject(TABS, null);
  if (!context) throw new Error("M3Tab must be placed inside M3Tabs");
  return context;
}
