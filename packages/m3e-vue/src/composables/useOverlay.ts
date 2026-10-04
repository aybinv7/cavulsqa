import { onScopeDispose, toValue, useId, watch, type MaybeRefOrGetter } from "vue";
import { useM3eConfig } from "../services/config.js";

export interface UseOverlayOptions {
  open: MaybeRefOrGetter<boolean>;
  dismissible: MaybeRefOrGetter<boolean>;
  onClose: () => void;
}

/**
 * Registers an open overlay on the app's stack, so Escape and Android back close the topmost one
 * and nothing underneath it.
 */
export function useOverlay(options: UseOverlayOptions) {
  const { overlays } = useM3eConfig();
  const id = useId();
  let remove: (() => void) | null = null;

  watch(
    () => toValue(options.open),
    (open) => {
      if (open && !remove) {
        remove = overlays.push({
          id,
          close: options.onClose,
          dismissible: () => toValue(options.dismissible),
        });
      } else if (!open && remove) {
        remove();
        remove = null;
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => remove?.());

  return { id, isTop: () => overlays.isTop(id) };
}
