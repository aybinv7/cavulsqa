import { nextTick, onScopeDispose, watch, type Ref } from "vue";
import { scrollableAncestor } from "../utils/scroll.js";
import { dropOffset, sortFrame, type Slot } from "../utils/sortable.js";

export interface ListSortableOptions {
  list: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  /** Reorder the data; the list follows it on the next render. */
  onSort: (from: number, to: number) => void;
  /** After a move lands - where to announce it. */
  onMoved?: (item: HTMLElement, to: number, count: number) => void;
  onPickUp?: () => void;
  onCross?: () => void;
}

const LONG_PRESS_MS = 450;
const SLOP = 8;
const EDGE = 72;
const MAX_SPEED = 16;
const DROP_MS = 320;

type Phase = "idle" | "pressing" | "dragging" | "dropping";

/**
 * Framework7's sortable list as a gesture: drag an item by its handle at once, or long-press it
 * anywhere and drag, as Android lists do. The others step aside on the fast spatial spring, the
 * page scrolls when the item nears an edge, and on release the item settles into its slot before
 * `onSort` reorders the data - the transforms are cleared after the next render, so nothing jumps.
 * Arrow keys on a focused handle move an item one place.
 */
export function useListSortable(options: ListSortableOptions) {
  let phase: Phase = "idle";
  let pointer = -1;
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let item: HTMLElement | null = null;
  let elements: HTMLElement[] = [];
  let slots: Slot[] = [];
  let from = 0;
  let to = 0;
  let offset = 0;
  let scroller: HTMLElement | null = null;
  let startScroll = 0;

  const itemsOf = (list: HTMLElement) =>
    [...list.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.classList.contains("m3-list-item"),
    );

  const capture = (list: HTMLElement, on: boolean): boolean => {
    try {
      if (on) list.setPointerCapture(pointer);
      else list.releasePointerCapture(pointer);
      return true;
    } catch {
      return false;
    }
  };

  const swallowClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  function cancelPress() {
    clearTimeout(pressTimer);
    pressTimer = undefined;
    if (phase === "pressing") phase = "idle";
  }

  function begin(target: HTMLElement) {
    const list = options.list.value;
    if (!list) return;
    clearTimeout(pressTimer);
    phase = "dragging";
    item = target;
    elements = itemsOf(list);
    from = elements.indexOf(target);
    to = from;
    offset = 0;
    slots = elements.map((element) => ({ top: element.offsetTop, height: element.offsetHeight }));
    scroller = scrollableAncestor(list);
    startScroll = scroller?.scrollTop ?? 0;
    capture(list, true);
    list.classList.add("m3-list--sorting");
    target.classList.add("m3-list-item--dragging");
    options.onPickUp?.();
    update();
  }

  function update() {
    if (phase !== "dragging" || !item) return;
    const first = slots[0]!;
    const last = slots.at(-1)!;
    const own = slots[from]!;
    const raw = lastY - startY + ((scroller?.scrollTop ?? 0) - startScroll);
    offset = Math.min(
      last.top + last.height - own.top - own.height,
      Math.max(first.top - own.top, raw),
    );
    item.style.transform = `translate3d(0, ${offset}px, 0)`;
    const next = sortFrame(slots, from, offset);
    elements.forEach((element, index) => {
      if (index === from) return;
      const shift = next.shifts[index]!;
      element.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
    });
    if (next.to !== to) {
      to = next.to;
      options.onCross?.();
    }
    autoScroll();
  }

  function autoScroll() {
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const toTop = lastY - rect.top;
    const toBottom = rect.bottom - lastY;
    let speed = 0;
    if (toTop < EDGE && scroller.scrollTop > 0)
      speed = -MAX_SPEED * (1 - Math.max(0, toTop) / EDGE);
    else if (
      toBottom < EDGE &&
      scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight
    ) {
      speed = MAX_SPEED * (1 - Math.max(0, toBottom) / EDGE);
    }
    if (speed === 0) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (phase !== "dragging" || !scroller) return;
      scroller.scrollTop += speed;
      update();
    });
  }

  function drop() {
    const list = options.list.value;
    const dropped = item;
    if (phase !== "dragging" || !list || !dropped) return;
    phase = "dropping";
    cancelAnimationFrame(frame);
    frame = 0;
    capture(list, false);
    list.addEventListener("click", swallowClick, { capture: true, once: true });
    setTimeout(() => list.removeEventListener("click", swallowClick, { capture: true }), 0);
    dropped.classList.add("m3-list-item--dropping");
    dropped.style.transform = `translate3d(0, ${dropOffset(slots, from, to)}px, 0)`;
    setTimeout(() => void settle(list, dropped), DROP_MS);
  }

  async function settle(list: HTMLElement, dropped: HTMLElement) {
    const moved = from !== to;
    const count = elements.length;
    if (moved) {
      options.onSort(from, to);
      await nextTick();
    }
    list.classList.add("m3-list--settled");
    for (const element of elements) element.style.transform = "";
    dropped.classList.remove("m3-list-item--dragging", "m3-list-item--dropping");
    void list.offsetHeight;
    list.classList.remove("m3-list--sorting", "m3-list--settled");
    item = null;
    elements = [];
    phase = "idle";
    if (moved) options.onMoved?.(dropped, to, count);
  }

  function onPointerDown(event: PointerEvent) {
    if (phase !== "idle" || event.button !== 0 || event.isPrimary === false) return;
    if (!options.enabled()) return;
    const list = options.list.value;
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest<HTMLElement>(".m3-list-item");
    if (!list || !row || row.parentElement !== list) return;
    if (target?.closest("[data-sort-ignore]")) return;
    pointer = event.pointerId;
    startX = event.clientX;
    startY = lastY = event.clientY;
    if (target?.closest("[data-sort-handle]")) {
      begin(row);
      return;
    }
    phase = "pressing";
    pressTimer = setTimeout(() => begin(row), LONG_PRESS_MS);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    if (phase === "pressing") {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > SLOP) cancelPress();
      return;
    }
    if (phase !== "dragging") return;
    lastY = event.clientY;
    update();
  }

  function onPointerEnd(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    if (phase === "pressing") cancelPress();
    else if (phase === "dragging") drop();
  }

  function onTouchMove(event: TouchEvent) {
    if (phase === "dragging" && event.cancelable) event.preventDefault();
  }

  function onContextMenu(event: Event) {
    if (phase !== "idle") event.preventDefault();
  }

  async function onKeydown(event: KeyboardEvent) {
    if (phase !== "idle" || !options.enabled()) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const handle = (event.target as Element | null)?.closest<HTMLElement>("[data-sort-handle]");
    const list = options.list.value;
    const row = handle?.closest<HTMLElement>(".m3-list-item");
    if (!handle || !list || !row) return;
    const rows = itemsOf(list);
    const index = rows.indexOf(row);
    const next = index + (event.key === "ArrowUp" ? -1 : 1);
    if (index < 0 || next < 0 || next >= rows.length) return;
    event.preventDefault();
    options.onSort(index, next);
    await nextTick();
    row.querySelector<HTMLElement>("[data-sort-handle]")?.focus();
    options.onMoved?.(row, next, rows.length);
  }

  const detach = (list: HTMLElement) => {
    list.removeEventListener("pointerdown", onPointerDown);
    list.removeEventListener("pointermove", onPointerMove);
    list.removeEventListener("pointerup", onPointerEnd);
    list.removeEventListener("pointercancel", onPointerEnd);
    list.removeEventListener("touchmove", onTouchMove);
    list.removeEventListener("contextmenu", onContextMenu);
    list.removeEventListener("keydown", onKeydown);
  };

  watch(
    options.list,
    (list, previous) => {
      if (previous) detach(previous);
      if (!list) return;
      list.addEventListener("pointerdown", onPointerDown, { passive: true });
      list.addEventListener("pointermove", onPointerMove, { passive: true });
      list.addEventListener("pointerup", onPointerEnd, { passive: true });
      list.addEventListener("pointercancel", onPointerEnd, { passive: true });
      list.addEventListener("touchmove", onTouchMove, { passive: false });
      list.addEventListener("contextmenu", onContextMenu);
      list.addEventListener("keydown", onKeydown);
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    clearTimeout(pressTimer);
    cancelAnimationFrame(frame);
    if (options.list.value) detach(options.list.value);
  });
}
