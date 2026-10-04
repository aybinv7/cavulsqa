import { inject, type InjectionKey } from "vue";

export interface MenuContext {
  close: () => void;
  variant: () => "standard" | "vibrant";
}

export const MENU: InjectionKey<MenuContext> = Symbol("m3-menu");

export function useMenu(): MenuContext {
  const context = inject(MENU, null);
  if (!context) throw new Error("M3MenuItem must be placed inside M3Menu");
  return context;
}
