import type { Directive } from "vue";

interface RippleState {
  down: (event: PointerEvent) => void;
  up: () => void;
  active: { ripple: HTMLElement; grow: Animation; startedAt: number } | null;
}

const states = new WeakMap<HTMLElement, RippleState>();
const GROW_MS = 450;
const MIN_VISIBLE_MS = 225;
const FADE_MS = 150;
const DECELERATE = "cubic-bezier(0.05, 0.7, 0.1, 1)";

const reduced = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function isDisabled(element: HTMLElement): boolean {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

function layerOf(element: HTMLElement): HTMLElement {
  let layer = element.querySelector<HTMLElement>(":scope > .m3-ripple-layer");
  if (!layer) {
    layer = document.createElement("span");
    layer.className = "m3-ripple-layer";
    layer.setAttribute("aria-hidden", "true");
    element.prepend(layer);
  }
  return layer;
}

function attach(element: HTMLElement) {
  if (states.has(element)) return;

  const state: RippleState = {
    active: null,
    down(event) {
      if (event.button !== 0 || isDisabled(element)) return;
      state.up();
      element.setAttribute("data-pressed", "");
      if (reduced() || typeof element.animate !== "function") return;
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
      const ripple = document.createElement("span");
      ripple.className = "m3-ripple";
      ripple.style.cssText = `width:${radius * 2}px;height:${radius * 2}px;left:${x - radius}px;top:${y - radius}px`;
      layerOf(element).appendChild(ripple);
      const grow = ripple.animate([{ transform: "scale(0.2)" }, { transform: "scale(1)" }], {
        duration: GROW_MS,
        easing: DECELERATE,
        fill: "forwards",
      });
      state.active = { ripple, grow, startedAt: performance.now() };
    },
    up() {
      element.removeAttribute("data-pressed");
      const active = state.active;
      if (!active) return;
      state.active = null;
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - active.startedAt));
      const fade = active.ripple.animate(
        [{ opacity: getComputedStyle(active.ripple).opacity }, { opacity: 0 }],
        {
          duration: FADE_MS,
          delay: wait,
          fill: "forwards",
        },
      );
      fade.onfinish = () => active.ripple.remove();
      fade.oncancel = () => active.ripple.remove();
    },
  };

  element.addEventListener("pointerdown", state.down, { passive: true });
  element.addEventListener("pointerup", state.up, { passive: true });
  element.addEventListener("pointercancel", state.up, { passive: true });
  element.addEventListener("pointerleave", state.up, { passive: true });
  states.set(element, state);
}

function detach(element: HTMLElement) {
  const state = states.get(element);
  if (!state) return;
  state.up();
  element.removeEventListener("pointerdown", state.down);
  element.removeEventListener("pointerup", state.up);
  element.removeEventListener("pointercancel", state.up);
  element.removeEventListener("pointerleave", state.up);
  element.querySelector(":scope > .m3-ripple-layer")?.remove();
  states.delete(element);
}

/**
 * The M3 press: a ripple from the touch point plus `data-pressed` on the element while the pointer
 * is down, which components key their pressed shape on. `:active` is unreliable in Android
 * WebViews without a touch listener; this is that listener. `v-ripple="false"` turns it off.
 */
export const vRipple: Directive<HTMLElement, boolean | undefined> = {
  mounted(element, binding) {
    if (binding.value !== false) attach(element);
  },
  updated(element, binding) {
    if (binding.value === false) detach(element);
    else attach(element);
  },
  beforeUnmount(element) {
    detach(element);
  },
};
