import type { MessageLocation } from "@cavulsqa/m3e-vue";
import { currentPosition, PositionError } from "@/modules/gallery/composables/currentPosition";

const DEPOT = { lat: 35.69739, lng: -0.63309 } as const;

/**
 * Shares where the device is. A second tap while a fix is pending is ignored rather than queued, and
 * every way the lookup can fail - no permission, no fix, too slow, no geolocation at all - says which
 * one it was and offers the depot instead, so the demo still has something to send on an emulator.
 */
export function useLocationShare(send: (location: MessageLocation) => void) {
  const { t } = useI18n();
  const snackbar = useSnackbar();
  const locating = shallowRef(false);

  async function share() {
    if (locating.value) return;
    locating.value = true;
    let reason: PositionError["reason"];
    try {
      const at = await currentPosition();
      send({ ...at, label: t("gallery.chat.location.here") });
      return;
    } catch (error) {
      reason = error instanceof PositionError ? error.reason : "unavailable";
    } finally {
      locating.value = false;
    }
    const result = await snackbar.show({
      message: t(`gallery.chat.location.${reason}`),
      action: t("gallery.chat.location.sendDepot"),
      duration: "long",
    });
    if (result === "action") send({ ...DEPOT, label: t("gallery.chat.location.depot") });
  }

  return { locating, share };
}
