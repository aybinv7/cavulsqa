import { inject, type ComputedRef, type InjectionKey } from "vue";
import type { ButtonSize } from "./sizes.js";

export interface ButtonGroupContext {
  size: ComputedRef<ButtonSize | undefined>;
  connected: ComputedRef<boolean>;
}

export const BUTTON_GROUP: InjectionKey<ButtonGroupContext> = Symbol("m3-button-group");

export function useButtonGroup(): ButtonGroupContext | null {
  return inject(BUTTON_GROUP, null);
}
