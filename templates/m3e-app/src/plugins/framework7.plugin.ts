import type { Framework7Parameters } from "framework7/types";
import routes from "@/router";

/**
 * Framework7 runs as the navigation engine: routing, the per-tab view stacks and the page
 * lifecycle. The theme is pinned to Material because its Material page metrics are what the M3
 * components sit in; nothing visual of Framework7's own is used. Pages move with `m3e-axis`, the
 * shared-axis transition in `assets/css/layout/transitions.css`, and Framework7 plays it backwards
 * on back.
 */
export function framework7Parameters(): Framework7Parameters {
  return {
    name: "App",
    theme: "md",
    darkMode: false,
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
      transition: "m3e-axis",
      browserHistory: false,
      mdSwipeBack: false,
    },
  };
}
