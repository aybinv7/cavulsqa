import { useM3eConfig } from "../services/config.js";
import type { ActionSheetService } from "../services/actionSheet.js";
import type { DialogService } from "../services/dialog.js";
import type { SnackbarQueue } from "../services/snackbar.js";
import type { M3eHaptics } from "../services/config.js";

/** `show({ message, action })` resolves how the snackbar ended. Needs `<M3SnackbarHost>` mounted once. */
export function useSnackbar(): Pick<SnackbarQueue, "show" | "clear"> {
  const { snackbar } = useM3eConfig();
  return { show: (options) => snackbar.show(options), clear: () => snackbar.clear() };
}

/** `confirm({ headline, confirmLabel })` resolves true or false. Needs `<M3DialogHost>` mounted once. */
export function useDialog(): Pick<DialogService, "confirm"> {
  const { dialog } = useM3eConfig();
  return { confirm: (options) => dialog.confirm(options) };
}

/** `open({ groups })` resolves the chosen id or null. Needs `<M3ActionSheetHost>` mounted once. */
export function useActionSheet(): Pick<ActionSheetService, "open"> {
  const { actionSheet } = useM3eConfig();
  return { open: (options) => actionSheet.open(options) };
}

export function useHaptics(): Required<M3eHaptics> {
  const { haptics } = useM3eConfig();
  return {
    tick: () => haptics.tick?.(),
    confirm: () => haptics.confirm?.(),
  };
}
