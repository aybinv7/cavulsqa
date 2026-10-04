import { inject, shallowRef, type InjectionKey, type ShallowRef } from "vue";
import { createOverlayStack, type OverlayStack } from "./overlayStack.js";
import { createSnackbarQueue, type SnackbarQueue } from "./snackbar.js";
import { createDialogService, type DialogService } from "./dialog.js";
import { createActionSheetService, type ActionSheetService } from "./actionSheet.js";
import { createNotificationQueue, type NotificationQueue } from "./notification.js";

/** Native feedback the app wires in; every call is optional and fire-and-forget. */
export interface M3eHaptics {
  /** A small state change: a toggle, a selection, a detent. */
  tick?: () => void;
  /** Something landed: a sheet settling open, a confirmed action. */
  confirm?: () => void;
}

export interface M3eConfig {
  /** `null` follows `prefers-reduced-motion`; a boolean is the app's own setting and wins. */
  reducedMotion: ShallowRef<boolean | null>;
  haptics: M3eHaptics;
  overlays: OverlayStack;
  snackbar: SnackbarQueue;
  dialog: DialogService;
  actionSheet: ActionSheetService;
  notification: NotificationQueue;
}

export const M3E_CONFIG: InjectionKey<M3eConfig> = Symbol("m3e-config");

export interface M3eOptions {
  reducedMotion?: boolean | null;
  haptics?: M3eHaptics;
}

export function createM3eConfig(options: M3eOptions = {}): M3eConfig {
  return {
    reducedMotion: shallowRef(options.reducedMotion ?? null),
    haptics: options.haptics ?? {},
    overlays: createOverlayStack(),
    snackbar: createSnackbarQueue(),
    dialog: createDialogService(),
    actionSheet: createActionSheetService(),
    notification: createNotificationQueue(),
  };
}

let standalone: M3eConfig | null = null;

/**
 * The app's config from `app.use(createM3e())`. Without the plugin a component still works on a
 * private config, but nothing outside it can close its overlays - Android back included.
 */
export function useM3eConfig(): M3eConfig {
  const provided = inject(M3E_CONFIG, null);
  if (provided) return provided;
  standalone ??= createM3eConfig();
  return standalone;
}
