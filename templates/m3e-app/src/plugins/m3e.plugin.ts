import { createM3e } from "@cavulsqa/m3e-vue";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const native = Capacitor.isNativePlatform();

function impact(style: ImpactStyle): void {
  if (!native) return;
  Haptics.impact({ style }).catch(() => undefined);
}

/**
 * The one m3e instance: components inject it, the Android back handler closes its overlays, and
 * the theme writes the motion preference into it. Haptics are best-effort - a device without a
 * vibrator rejects, and a missed tick is not worth an error.
 */
export const m3e = createM3e({
  haptics: {
    tick: () => impact(ImpactStyle.Light),
    confirm: () => impact(ImpactStyle.Medium),
  },
});
