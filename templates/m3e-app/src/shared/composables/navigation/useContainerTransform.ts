import type { Router } from "framework7/types";

/** The Framework7 transition name; its CSS is `m3e-container` in `assets/css/layout/container-transform.css`. */
export const CONTAINER_TRANSITION = "m3e-container";

const PENDING_FOR_MS = 1500;

/** Which element each detail page grew out of, so going back can shrink it into the same place. */
const origins = new WeakMap<HTMLElement, HTMLElement>();
let pending: { source: HTMLElement; at: number } | null = null;
let listening = false;

const CONTAINERS = ".m3-list-item, .m3-card";

function containerOf(event: Event): HTMLElement | null {
  const target = (event.currentTarget ?? event.target) as Element | null;
  return target instanceof Element ? target.closest<HTMLElement>(CONTAINERS) : null;
}

function viewOf(element: HTMLElement): HTMLElement | null {
  return element.closest<HTMLElement>(".view");
}

/**
 * Writes where the container starts (or ends) on the view: the source's box as insets from the
 * view's edges, its corner radius and its colour. Physical insets, so right-to-left needs nothing.
 */
const isClear = (color: string) => color === "transparent" || color === "rgba(0, 0, 0, 0)";

/**
 * The element that draws the container: the source when it has a background, else the first
 * element inside it of the same size that does - a list item paints its shape on an inner surface.
 */
function surfaceOf(source: HTMLElement): HTMLElement {
  if (!isClear(getComputedStyle(source).backgroundColor)) return source;
  const outer = source.getBoundingClientRect();
  for (const element of source.querySelectorAll<HTMLElement>("*")) {
    const rect = element.getBoundingClientRect();
    if (Math.abs(rect.width - outer.width) > 2 || Math.abs(rect.height - outer.height) > 2)
      continue;
    if (!isClear(getComputedStyle(element).backgroundColor)) return element;
  }
  return source;
}

function frame(view: HTMLElement, source: HTMLElement) {
  const surface = surfaceOf(source);
  const box = view.getBoundingClientRect();
  const rect = surface.getBoundingClientRect();
  const style = getComputedStyle(surface);
  const color = style.backgroundColor;
  const transparent = isClear(color);
  const set = (name: string, value: string) => view.style.setProperty(`--m3e-ct-${name}`, value);
  set("top", `${Math.max(0, rect.top - box.top)}px`);
  set("left", `${Math.max(0, rect.left - box.left)}px`);
  set("right", `${Math.max(0, box.right - rect.right)}px`);
  set("bottom", `${Math.max(0, box.bottom - rect.bottom)}px`);
  set("radius", style.borderTopLeftRadius || "0px");
  set("color", transparent ? "var(--md-sys-color-surface-container-low)" : color);
}

function listen() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener(
    "page:mounted",
    (event) => {
      const page = event.target;
      if (!pending || !(page instanceof HTMLElement)) return;
      if (performance.now() - pending.at < PENDING_FOR_MS) origins.set(page, pending.source);
      pending = null;
    },
    true,
  );
  document.addEventListener(
    "page:beforeout",
    (event) => {
      const page = event.target;
      if (!(page instanceof HTMLElement)) return;
      const source = origins.get(page);
      const view = viewOf(page);
      if (source?.isConnected && view) frame(view, source);
    },
    true,
  );
}

/**
 * Material's container transform on Framework7's router: the tapped card grows into the page it
 * opens - its box, corners and colour morph to the full screen while the page's content fades in -
 * and going back, by the app bar, Android back or anything else that calls `router.back()`, shrinks
 * the page into the card again, re-measured in case the list moved. Framework7 replays the
 * transition a page was opened with, which is what makes every way back reverse it.
 *
 * @see https://m3.material.io/styles/motion/transitions/transition-patterns#b67cba74-6240-4663-a423-d537b6d21187
 */
export function useContainerTransform() {
  listen();

  /**
   * Opens `url` out of `from`: the element itself, or the event of a tap on it, whose closest list
   * item or card becomes the container.
   */
  function open(router: Router.Router, from: Event | HTMLElement | null, url: string) {
    const source = from instanceof Event ? containerOf(from) : from;
    const view = source ? viewOf(source) : null;
    if (!source || !view) {
      router.navigate(url);
      return;
    }
    frame(view, source);
    pending = { source, at: performance.now() };
    router.navigate(url, { transition: CONTAINER_TRANSITION });
  }

  return { open };
}
