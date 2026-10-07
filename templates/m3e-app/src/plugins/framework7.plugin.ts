import type { Framework7Parameters } from "framework7/types";
import routes from "@/router";

/**
 * Framework7 runs as the navigation engine: routing, the per-tab view stacks and the page
 * lifecycle. The theme is pinned to Material because its Material page metrics are what the M3
 * components sit in; nothing visual of Framework7's own is used except the page transition: its
 * Material slide, mirrored for right-to-left and stilled under reduced motion in
 * `assets/css/layout/transitions.css`.
 */
export function framework7Parameters(): Framework7Parameters {
  return {
    name: "App",
    theme: "md",
    // Framework7 sets or clears `dark` on <html> at init, and F7App turns an unset value into
    // `false`, which cleared the dark mode `startTheme` applied before mount. Handing it the mode
    // already applied keeps them in agreement; the theme's own watcher owns the class afterwards.
    darkMode:
      typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
    routes,
    touch: {
      tapHold: true,
      tapHoldDelay: 500,
      tapHoldPreventClicks: true,
      touchRipple: false,
      activeState: false,
    },
    statusbar: { enabled: false },
    view: {
      animate: true,
      browserHistory: false,
      mdSwipeBack: false,
    },
  };
}
