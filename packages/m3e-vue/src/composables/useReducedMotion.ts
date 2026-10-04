import { computed, shallowRef, type ComputedRef } from "vue";
import { useM3eConfig } from "../services/config.js";

const QUERY = "(prefers-reduced-motion: reduce)";
const systemPrefers = shallowRef(false);
let listening = false;

function listen() {
  if (listening || typeof matchMedia === "undefined") return;
  listening = true;
  const media = matchMedia(QUERY);
  systemPrefers.value = media.matches;
  media.addEventListener("change", (event) => (systemPrefers.value = event.matches));
}

/**
 * Reduced motion keeps meaning and drops travel: morphs and colour stay, rotation, parallax and
 * bounce go. The app's own setting, passed to the plugin, wins over the system's.
 */
export function useReducedMotion(): ComputedRef<boolean> {
  listen();
  const config = useM3eConfig();
  return computed(() => config.reducedMotion.value ?? systemPrefers.value);
}
