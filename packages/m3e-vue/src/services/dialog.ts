import { shallowRef, type Component, type ShallowRef } from "vue";

export interface DialogOptions {
  headline: string;
  text?: string;
  /** Centres the headline under it, as M3 does for dialogs with a hero icon. */
  icon?: Component;
  confirmLabel: string;
  /** Omit for an alert with a single action. */
  dismissLabel?: string;
  /** Paints the confirm action in the error role. */
  destructive?: boolean;
  /** Scrim, Escape and Android back close it; off for a decision that must be made. */
  dismissible?: boolean;
}

export interface DialogRequest extends DialogOptions {
  id: number;
  settle: (confirmed: boolean) => void;
}

export interface DialogService {
  readonly current: ShallowRef<DialogRequest | null>;
  /** Resolves true on confirm, false on dismiss - never rejects. */
  confirm(options: DialogOptions): Promise<boolean>;
  settle(confirmed: boolean): void;
}

export function createDialogService(): DialogService {
  const current = shallowRef<DialogRequest | null>(null);
  const pending: DialogRequest[] = [];
  let nextId = 1;

  return {
    current,
    confirm(options) {
      return new Promise<boolean>((resolve) => {
        pending.push({ ...options, id: nextId++, settle: resolve });
        current.value ??= pending.shift() ?? null;
      });
    },
    settle(confirmed) {
      const request = current.value;
      if (!request) return;
      request.settle(confirmed);
      current.value = pending.shift() ?? null;
    },
  };
}
