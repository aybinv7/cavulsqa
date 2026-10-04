import { useMediaQuery } from "@vueuse/core";
import { computed, type ComputedRef } from "vue";

export type WindowClass = "compact" | "medium" | "expanded" | "large";

/**
 * M3's window size classes by width: compact under 600dp, medium to 839, expanded to 1199, large
 * from 1200. Layout decisions key on these, never on device type - a phone in landscape is medium.
 *
 * @see https://m3.material.io/foundations/layout/applying-layout
 */
export function useWindowClass(): ComputedRef<WindowClass> {
  const medium = useMediaQuery("(min-width: 600px)");
  const expanded = useMediaQuery("(min-width: 840px)");
  const large = useMediaQuery("(min-width: 1200px)");
  return computed(() => {
    if (large.value) return "large";
    if (expanded.value) return "expanded";
    if (medium.value) return "medium";
    return "compact";
  });
}
