import { computed, onScopeDispose, toValue, useId, watch, type MaybeRefOrGetter } from "vue";
import { useM3eConfig } from "../services/config.js";

export interface UseOverlayOptions {
  open: MaybeRefOrGetter<boolean>;
  dismissible: MaybeRefOrGetter<boolean>;
  onClose: () => void;
}

/** The z-index of the first overlay; each one opened after it stacks a step higher. */
export const OVERLAY_BASE_Z = 12000;
const OVERLAY_STEP = 100;

/**
 * Registers an open overlay on the app's stack, so Escape and Android back close the topmost one
 * and nothing underneath it. `layer` is the style for the overlay's root: it sets
 * `--m3-overlay-z` from the overlay's place in the stack, so one opened from another - a
 * confirmation over a full-screen dialog, a menu in a sheet - always draws above it, whatever
 * their order in the document.
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

  const layer = computed(() => {
    const depth = overlays.entries.value.findIndex((entry) => entry.id === id);
    return depth < 0 ? {} : { "--m3-overlay-z": String(OVERLAY_BASE_Z + depth * OVERLAY_STEP) };
  });

  return { id, isTop: () => overlays.isTop(id), layer };
}
