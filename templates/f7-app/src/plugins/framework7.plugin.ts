import { Capacitor } from "@capacitor/core";
import type { Framework7Parameters } from "framework7/types";
import routes from "@/router";
import type { AppTheme } from "@/shared/composables/theme/useAppTheme";

export function framework7Parameters(theme: AppTheme, darkMode: boolean): Framework7Parameters {
  return {
    name: "App",
    // "auto" lets Framework7 pick iOS or Material from the device; Settings can pin either.
    theme,
    darkMode,
    routes,

    // Long-press is a real gesture on touch; without preventClicks it also fires a tap.
    touch: {
      tapHold: true,
      tapHoldDelay: 500,
      tapHoldPreventClicks: true,
    },

    input: { scrollIntoViewOnFocus: true },

    // The bar is drawn by the OS and overlaid; see useStatusBar.
    statusbar: { enabled: Capacitor.isNativePlatform() },

    view: {
      animate: true,
      // Each tab view keeps its own history, so switching back returns to the same screen.
      browserHistory: false,
    },

    panel: { swipe: true },
  };
}
