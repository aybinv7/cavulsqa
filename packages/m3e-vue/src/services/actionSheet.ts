import { shallowRef, type Component, type ShallowRef } from "vue";

export interface ActionSheetItem {
  id: string;
  label: string;
  supporting?: string;
  /** Pass the component itself (`markRaw` if it sits in reactive state). */
  icon?: Component;
  tone?: "default" | "destructive";
  /** Shows a check and the selected shape, for a choice among options. */
  selected?: boolean;
  disabled?: boolean;
}

export interface ActionSheetGroup {
  label?: string;
  items: readonly ActionSheetItem[];
}

export interface ActionSheetOptions {
  title?: string;
  supporting?: string;
  /** A row of shaped icon actions above the list, as in a share sheet. At most five read well. */
  quickActions?: readonly ActionSheetItem[];
  groups: readonly ActionSheetGroup[];
}

export interface ActionSheetRequest extends ActionSheetOptions {
  id: number;
  settle: (choice: string | null) => void;
}

export interface ActionSheetService {
  readonly current: ShallowRef<ActionSheetRequest | null>;
  /** Resolves the chosen item's id, or null when dismissed. Opening another dismisses this one. */
  open(options: ActionSheetOptions): Promise<string | null>;
  settle(choice: string | null): void;
}

export function createActionSheetService(): ActionSheetService {
  const current = shallowRef<ActionSheetRequest | null>(null);
  let nextId = 1;

  return {
    current,
    open(options) {
      current.value?.settle(null);
      return new Promise<string | null>((resolve) => {
        current.value = { ...options, id: nextId++, settle: resolve };
      });
    },
    settle(choice) {
      const request = current.value;
      if (!request) return;
      current.value = null;
      request.settle(choice);
    },
  };
}
