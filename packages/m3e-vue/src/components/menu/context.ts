import { inject, type InjectionKey } from "vue";

/** What a menu shares with its items and with the submenus opened from them. */
export interface MenuContext {
  /** Closes this menu and every menu it was opened from - what choosing an item does. */
  closeAll: () => void;
  variant: () => "standard" | "vibrant";
  /** Whether a node is inside this menu or any submenu open from it, for outside-tap detection. */
  contains: (node: Node) => boolean;
  /** Registers a submenu; opening one closes its open siblings. Returns the unregister function. */
  attach: (child: SubmenuHandle) => () => void;
  /** Called by a submenu as it opens, so the other submenus of this menu close. */
  opened: (child: SubmenuHandle) => void;
}

export interface SubmenuHandle {
  contains: (node: Node) => boolean;
  close: () => void;
}

export const MENU: InjectionKey<MenuContext> = Symbol("m3-menu");

export function useMenu(): MenuContext {
  const context = inject(MENU, null);
  if (!context) throw new Error("M3MenuItem must be placed inside M3Menu");
  return context;
}

export function useParentMenu(): MenuContext | null {
  return inject(MENU, null);
}
