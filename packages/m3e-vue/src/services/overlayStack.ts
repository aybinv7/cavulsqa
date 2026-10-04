import { shallowRef, type ShallowRef } from "vue";

export interface OverlayEntry {
  id: string;
  /** Asked to close by Escape, Android back or `closeTop()`. */
  close: () => void;
  /** A persistent overlay swallows back instead of closing. */
  dismissible: () => boolean;
}

export interface OverlayStack {
  readonly entries: ShallowRef<readonly OverlayEntry[]>;
  push(entry: OverlayEntry): () => void;
  isTop(id: string): boolean;
  /**
   * Closes the topmost overlay. Returns true when an overlay consumed the request - including a
   * persistent one that refused - so an Android back handler knows not to navigate.
   */
  closeTop(): boolean;
}

export function createOverlayStack(): OverlayStack {
  const entries = shallowRef<readonly OverlayEntry[]>([]);

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || entries.value.length === 0) return;
    event.preventDefault();
    stack.closeTop();
  };

  const sync = () => {
    if (typeof document === "undefined") return;
    if (entries.value.length > 0) document.addEventListener("keydown", onKeydown);
    else document.removeEventListener("keydown", onKeydown);
  };

  const stack: OverlayStack = {
    entries,
    push(entry) {
      entries.value = [...entries.value.filter((e) => e.id !== entry.id), entry];
      sync();
      return () => {
        entries.value = entries.value.filter((e) => e !== entry);
        sync();
      };
    },
    isTop(id) {
      return entries.value.at(-1)?.id === id;
    },
    closeTop() {
      const top = entries.value.at(-1);
      if (!top) return false;
      if (top.dismissible()) top.close();
      return true;
    },
  };
  return stack;
}
