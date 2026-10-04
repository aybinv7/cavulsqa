import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

export interface NavigationContext {
  selected: Ref<string | undefined>;
  /** `vertical`: icon over label. `horizontal`: icon beside label in a wider indicator. */
  layout: ComputedRef<"vertical" | "horizontal">;
  select: (value: string) => void;
}

export const NAVIGATION: InjectionKey<NavigationContext> = Symbol("m3-navigation");

export function useNavigation(component: string): NavigationContext {
  const context = inject(NAVIGATION, null);
  if (!context) throw new Error(`${component} must be placed inside its navigation container`);
  return context;
}
