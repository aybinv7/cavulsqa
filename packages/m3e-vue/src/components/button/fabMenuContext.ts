import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

export type FabMenuColor = "primary" | "secondary" | "tertiary";

export interface FabMenuContext {
  color: ComputedRef<FabMenuColor>;
  open: Ref<boolean>;
  close: () => void;
}

export const FAB_MENU: InjectionKey<FabMenuContext> = Symbol("m3-fab-menu");

export function useFabMenu(): FabMenuContext {
  const context = inject(FAB_MENU, null);
  if (!context) throw new Error("M3FabMenuItem must be placed inside M3FabMenu");
  return context;
}
