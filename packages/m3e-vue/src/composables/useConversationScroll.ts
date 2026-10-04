import { onMounted, onScopeDispose, shallowRef, watch, type Ref } from "vue";
import { scrollableAncestor } from "../utils/scroll.js";

type Key = string | number;

export interface ConversationScrollOptions {
  root: Ref<HTMLElement | null | undefined>;
  /** The message keys in order; rows carry them as `data-message-key`. */
  keys: () => readonly Key[];
  /** Whether a key is the owner's message - sending one always brings the end into view. */
  isOwn: (key: Key) => boolean;
  /** How close to the end, in px, still counts as reading the latest message. */
  threshold?: number;
}

interface Anchor {
  key: string;
  offset: number;
}

/**
 * The scroll behaviour a conversation needs, on whichever element scrolls it. It opens at the
 * newest message and stays there while the reader is there - as messages arrive, as the composer
 * grows, as the keyboard takes half the screen. A reader who scrolled back keeps their place: older
 * messages loading above, or new ones below, do not move what they are reading, and the new ones
 * are counted as unread instead. Sending always returns to the end.
 */
export function useConversationScroll(options: ConversationScrollOptions) {
  const threshold = options.threshold ?? 48;
  const atEnd = shallowRef(true);
  const far = shallowRef(false);
  const unread = shallowRef(0);
  const fresh = shallowRef<ReadonlySet<Key>>(new Set());
  let scroller: HTMLElement | null = null;
  let resize: ResizeObserver | null = null;
  let frame = 0;
  let jumping = false;
  let pinnedTop = 0;
  let snapshot: { pinned: boolean; anchor: Anchor | null; added: Key[] } | null = null;

  const distance = (element: HTMLElement) =>
    element.scrollHeight - element.scrollTop - element.clientHeight;

  function pin() {
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    pinnedTop = scroller.scrollTop;
  }

  /**
   * Whether the reader is still where the end was pinned. Content growing below them - the
   * composer measuring itself, an image, the keyboard - leaves them stuck to it; only their own
   * scrolling back up releases it.
   */
  function stuck(element: HTMLElement): boolean {
    return atEnd.value && element.scrollTop >= pinnedTop - 1;
  }

  function following(element: HTMLElement): boolean {
    return stuck(element) || distance(element) <= threshold;
  }

  function measure() {
    frame = 0;
    if (!scroller) return;
    const gap = distance(scroller);
    if (jumping && gap > threshold) return;
    jumping = false;
    if (stuck(scroller) && gap > 0) pin();
    else if (gap <= threshold) pinnedTop = scroller.scrollTop;
    if (gap <= threshold || stuck(scroller)) {
      atEnd.value = true;
      far.value = false;
      unread.value = 0;
      return;
    }
    atEnd.value = false;
    far.value = gap > scroller.clientHeight / 2;
  }

  function onScroll() {
    if (!frame) frame = requestAnimationFrame(measure);
  }

  function settle() {
    jumping = false;
    measure();
  }

  function toEnd(smooth = false) {
    if (!scroller) return;
    jumping = smooth;
    if (smooth) scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    else pin();
    atEnd.value = true;
    far.value = false;
    unread.value = 0;
  }

  function anchor(): Anchor | null {
    const root = options.root.value;
    if (!scroller || !root) return null;
    const rows = root.querySelectorAll<HTMLElement>("[data-message-key]");
    const top = scroller.getBoundingClientRect().top;
    let low = 0;
    let high = rows.length - 1;
    let found = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (rows[middle]!.getBoundingClientRect().bottom > top) {
        found = middle;
        high = middle - 1;
      } else low = middle + 1;
    }
    const row = rows[found];
    if (!row?.dataset.messageKey) return null;
    return { key: row.dataset.messageKey, offset: row.getBoundingClientRect().top - top };
  }

  function restore(target: Anchor | null) {
    const root = options.root.value;
    if (!scroller || !root || !target) return;
    const row = root.querySelector(`[data-message-key="${CSS.escape(target.key)}"]`);
    if (!row) return;
    const delta =
      row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - target.offset;
    if (Math.abs(delta) >= 1) scroller.scrollTop += delta;
  }

  watch(
    options.keys,
    (next, previous) => {
      const last = previous.at(-1);
      const from = last === undefined ? -1 : next.lastIndexOf(last);
      const replaced = previous.length > 0 && from < 0;
      const added = replaced ? [] : next.slice(from + 1);
      fresh.value = previous.length > 0 ? new Set(added) : new Set();
      const pinned = !scroller || replaced || following(scroller);
      snapshot = { pinned, anchor: pinned ? null : anchor(), added };
    },
    { flush: "pre" },
  );

  watch(
    options.keys,
    () => {
      const taken = snapshot;
      snapshot = null;
      if (!scroller || !taken) return;
      if (taken.pinned || taken.added.some(options.isOwn)) {
        toEnd();
        return;
      }
      restore(taken.anchor);
      unread.value += taken.added.length;
      measure();
    },
    { flush: "post" },
  );

  onMounted(() => {
    const root = options.root.value;
    if (!root) return;
    scroller = scrollableAncestor(root);
    if (!scroller) return;
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", settle, { passive: true });
    scroller.addEventListener("touchstart", settle, { passive: true });
    toEnd();
    if (typeof ResizeObserver === "undefined") return;
    resize = new ResizeObserver(() => {
      if (atEnd.value && !jumping && scroller && distance(scroller) > 0) pin();
    });
    resize.observe(root);
    resize.observe(scroller);
  });

  onScopeDispose(() => {
    scroller?.removeEventListener("scroll", onScroll);
    scroller?.removeEventListener("scrollend", settle);
    scroller?.removeEventListener("touchstart", settle);
    resize?.disconnect();
    if (frame) cancelAnimationFrame(frame);
  });

  return { atEnd, far, unread, fresh, jump: () => toEnd(true) };
}
