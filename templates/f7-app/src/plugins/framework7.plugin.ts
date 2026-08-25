import { Capacitor } from "@capacitor/core";
import type { Framework7Parameters } from "framework7/types";
import routes from "@/router";

export function framework7Parameters(): Framework7Parameters {
  return {
    name: "App",
    theme: "auto",
    darkMode: "auto",
    routes,

    // Long-press is a real gesture on a touch device; without preventClicks it also fires a tap.
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
