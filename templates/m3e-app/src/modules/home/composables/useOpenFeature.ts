import type { Router } from "framework7/types";
import type { HomeFeature } from "@/modules/home/composables/useHomeFeatures";

/** The transition's name without Framework7's prefix, as the rows and the detail page show it. */
export function transitionName(feature: HomeFeature): string {
  return feature.transition.replace(/^f7-/, "");
}

/**
 * Opens a feature's page inside the Home tab with that feature's own transition. Under reduced
 * motion it falls back to the app's default, which is a cross-fade there: a flip or a circle reveal
 * is exactly the movement reduced motion asks to remove.
 */
export function useOpenFeature() {
  const reduced = useReducedMotion();

  return (router: Router.Router, feature: HomeFeature) =>
    router.navigate(
      `/home/feature/${feature.id}/`,
      reduced.value ? {} : { transition: feature.transition },
    );
}
